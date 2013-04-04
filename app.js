
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , azure = require('azure')
  , uuid = require('uuid')
  , nconf = require('nconf');

nconf.argv()
     .env()
     .file({ file: 'config.json' });
    
var connectionString = nconf.get("CUSTOMCONNSTR_SERVICEBUS");
var topic = nconf.get("SERVICE_BUS_TOPIC");
var subscription = uuid.v4();
var serviceBusService = azure.createServiceBusService(connectionString);

  serviceBusService.listSubscriptions(topic, function(error, result) {
    if (error) {
      console.log(error);
    }
    console.log(result);
  });

serviceBusService.createSubscription(topic, subscription, function(error){
    if(!error){
        // Subscription created
        console.log("subscription create: " + subscription);
     }
});

process.on('exit', function() {
  serviceBusService.deleteSubscription(topic, subscription, function(error) {
    if (error) {
      console.log(error);
    }
  });
});

var app = express();

// all environments
app.set('port', nconf.get("PORT") || 3000);
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
    subscription: subscription,
    connectionString: nconf.get("CUSTOMCONNSTR_SERVICEBUS"),
    logger: io.get('logger')
  }));
});

io.sockets.on('connection', function (socket) {
  
  socket.on('message', function(data) {
      socket.broadcast.emit('news', data);
  });

});
