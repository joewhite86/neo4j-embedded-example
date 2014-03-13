var java = require('java'),
    path = require('path'),
    Service = require('./src/main/js/Service'),
    Database = require('./src/main/js/Database'),
    JavaMapper = require('./src/main/js/JavaMapper')

java.classpath.push(path.join(__dirname, 'target/neo4j-embedded-example-1.0.jar'))
java.options.push("-Xmx4G")

var service = java.newInstanceSync('Service')
service.connectSync("data")
var controller = java.newInstanceSync('UserController', service)
service = new Service(service)

var database = new Database(service)

var result = controller.searchSync("test");
var mapped = JavaMapper.map(result);
console.log(mapped.getProperty("name"))

database.query('match (user:User) return user').then(function(result) {
  console.log(result[0].user.getProperty("name"))
})