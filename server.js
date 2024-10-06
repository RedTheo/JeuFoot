// Importation des modules nécessaires pour créer un serveur et gérer les connexions en temps réel
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Création d'une application Express pour servir les fichiers côté client
const app = express();

// Création d'un serveur HTTP à partir de l'application Express
const server = http.createServer(app);

// Initialisation de Socket.IO pour ajouter des fonctionnalités de communication en temps réel au serveur
const io = socketIo(server);

// Utilisation d'Express pour servir les fichiers statiques (HTML, CSS, JS) situés dans le dossier "public"
app.use(express.static(__dirname + '/public'));
app.use(express.static("."));

// Variable pour stocker les joueurs connectés, chaque joueur sera identifié par un ID unique
let players = {};
let hostPlayerId = null; 
let teamRedCount = 0;
let teamBlueCount = 0;
// Variables pour stocker les scores des équipes
let scores = { teamRed: 0, teamBlue: 0 };



// Variable pour gérer la balle
let ball = {
    x: 0,
    y: 0,
    z: 0,
    velocity: { x: 0, y: 0, z: 0 }
};

// Gestion des événements lorsqu'un utilisateur se connecte au serveur
io.on('connection', (socket) => {

    teamRedCount = Object.values(players).filter(player => player.team === 'teamRed').length;
    teamBlueCount = Object.values(players).filter(player => player.team === 'teamBlue').length;
    console.log(teamRedCount);
    console.log(teamBlueCount);
    console.log('Nouvel utilisateur connecté :', socket.id);
    if (!hostPlayerId) {
        hostPlayerId = socket.id;
        console.log(`Joueur ${socket.id} est désigné comme l'hôte`);
        io.to(socket.id).emit('hostAssigned'); // Envoyer un événement au client pour lui dire qu'il est l'hôte
    }
    io.emit('hostUpdate', { hostId: hostPlayerId });

    socket.on('disconnect', () => {
        console.log(`Joueur déconnecté : ${socket.id}`);
        if (socket.id === hostPlayerId) {
            const connectedPlayers = Object.keys(io.sockets.sockets);
            if (connectedPlayers.length > 0) {
                hostPlayerId = connectedPlayers[0];
                io.to(hostPlayerId).emit('hostAssigned'); 
                io.emit('hostUpdate', { hostId: hostPlayerId }); 
            } else {
                hostPlayerId = null; 
            }
        }
    });
    // Attribuer le joueur à une équipe aléatoire (Rouge ou Bleu)
    const team = teamRedCount <= teamBlueCount ? 'teamRed' : 'teamBlue';
    let positionX;
    if (team === 'teamRed') {
        // Position pour les joueurs rouges (droite du terrain)
        positionX = Math.random() * 10 + 1; // entre 0 et 5
    } else {
        // Position pour les joueurs bleus (gauche du terrain)
        positionX = Math.random() * -10 -1; // entre -5 et 0
    }

    // Assigner au joueur une position aléatoire et une couleur en fonction de son équipe
    players[socket.id] = {
        id: socket.id, 
        x: positionX,
        y: 0, 
        z: Math.random() * 5 - 5, 
        color: team === 'teamRed' ? '#FF0000' : '#0000FF', // Rouge ou Bleu en fonction de l'équipe
        team: team // Stocker l'équipe du joueur
    };

    // Envoyer la position de la balle et les scores actuels au nouveau joueur
    socket.emit('ballPosition', ball);
    socket.emit('scoreUpdate', scores);

    // Envoyer la liste de tous les joueurs actuels au nouveau joueur
    socket.emit('init', players);

    // Informer tous les autres joueurs qu'un nouveau joueur vient de se connecter
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Recevoir les mises à jour de la balle depuis un joueur
    socket.on('ballMoved', (newBall) => {
        
        socket.broadcast.emit('ballPosition', newBall);
    });

    // Lorsqu'un joueur se déplace, il envoie sa nouvelle position au serveur
    socket.on('move', (data) => {
        players[socket.id].x = data.x;
        players[socket.id].z = data.z;
        socket.broadcast.emit('playerMoved', players[socket.id]);
    });
    // Écouter les mises à jour de score
    socket.on('scoreUpdate', (data) => {
        if (data.team === 'blue') {
            scores.teamBlue++;
            console.log("But bleu");
        } else if (data.team === 'red') {
            scores.teamRed++;
            console.log("But rouge");
        }

        // Émettre les scores mis à jour à tous les clients
        io.emit('scoreUpdate', scores);
    });
    // Gestion de la déconnexion d'un joueur
    socket.on('disconnect', () => {
        console.log('Utilisateur déconnecté :', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });

    
});

// Le serveur écoute les connexions sur le port 3000
server.listen(3000, () => {
    console.log('Serveur démarré sur le port 3000');
});
