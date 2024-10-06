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

app.use(express.static(__dirname + '/public'));
app.use(express.static("."));

// CREATION VARIABLES
let players = {};
let hostPlayerId = null; 
let teamRedCount = 0;
let teamBlueCount = 0;
let scores = { teamRed: 0, teamBlue: 0 };
let ball = {
    x: 0,
    y: 0,
    z: 0,
    velocity: { x: 0, y: 0, z: 0 }
};



io.on('connection', (socket) => {
    //GESTION EQUIPES
    teamRedCount = Object.values(players).filter(player => player.team === 'teamRed').length;
    teamBlueCount = Object.values(players).filter(player => player.team === 'teamBlue').length;
    console.log(teamRedCount);
    console.log(teamBlueCount);

   

    const team = teamRedCount <= teamBlueCount ? 'teamRed' : 'teamBlue';
    let positionX;
    if (team === 'teamRed') {
        positionX = Math.random() * 10 + 1; 
    } else {
        positionX = Math.random() * -10 -1; 
    }

    //DEFINITION JOUEUR
    players[socket.id] = {
        id: socket.id, 
        x: positionX,
        y: 0, 
        z: Math.random() * 5 - 5, 
        color: team === 'teamRed' ? '#FF0000' : '#0000FF', 
        team: team 
    };

    

    
    //GESTION HOST
    if (!hostPlayerId) {
        hostPlayerId = socket.id;
        console.log(`Joueur ${socket.id} est désigné comme l'hôte`);
        socket.to(socket.id).emit('hostAssigned'); 
    }
    socket.emit('hostUpdate', { hostId: hostPlayerId });


    

    socket.emit('init', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);


    //GESTION BALLE
    
    socket.emit('ballPosition', ball);
    socket.on('ballMoved', (newBall) => {
        
        socket.broadcast.emit('ballPosition', newBall);
    });


    //GESTION DEPLACEMENT
    socket.on('move', (data) => {
        players[socket.id].x = data.x;
        players[socket.id].z = data.z;
        socket.broadcast.emit('playerMoved', players[socket.id]);
    });

    //GESTION SCORE 
    socket.on('scoreUpdate', (data) => {
        if (data.team === 'blue') {
            scores.teamBlue++;
            console.log("But bleu");
        } else if (data.team === 'red') {
            scores.teamRed++;
            console.log("But rouge");
        }
        socket.emit('scoreUpdate', scores);
    });


    

    socket.on('disconnect', () => {
        console.log(`Utilisateur déconnecté : ${socket.id}`);
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
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
    
});

// Le serveur écoute les connexions sur le port 3000
server.listen(3000, () => {
    console.log('Serveur démarré sur le port 3000');
});
