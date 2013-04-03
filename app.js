
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , nconf = require('nconf');

nconf.argv()
     .env()
     .file({ file: 'config.json' });

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var io = require('socket.io').listen(server);

// Setup the Service Bus store for Socket.IO
var sbstore = require('socket.io-servicebus');
io.configure(function () {
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 30); 
  io.set('store', new sbstore({
    topic: nconf.get("SERVICE_BUS_TOPIC"),
    subscription: nconf.get("SERVICE_BUS_SUBSCRIPTION"),
    connectionString: nconf.get("CUSTOMCONNSTR_SERVICEBUS")
  }));
});

io.sockets.on('connection', function (socket) {
  
  socket.on('message', function(data) {
      socket.broadcast.emit('news', data);
      
      var entity = {
        PartitionKey: 'news',
        RowKey: (new Date()).getTime() + "_" + Math.floor(Math.random()*1000),
        Message: data,
      }
      tableService.insertEntity('messages', entity, function(error){
        if(!error){
         // Entity inserted
        }
      });

  });

});