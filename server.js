// pa crear el archivo package.json npm init -y
// pa la librería (la carpeta node-modules) npm install express
// para instalar el sanitizador npm install sanitize-html

let express = require('express');
let mongodb = require('mongodb');
let sanitizeHTML = require('sanitize-html');

let app = express();
let db;

let port = process.env.port;
if (port == null || port == '') {
    app.listen(3000);
}

// para que haya acceso a la carpeta public desde el root
app.use(express.static('public'));

// para hacer la conexion con la cuenta
// =====================================================

// mongodb.connect(a,b,c)
// a: connection string, "a donde (o que) nos queremos conectar", ( código que saco de mongodb atlas )
// c: fcn que el .connect method va a ejecutar cuando abra la conexión
// b: mongodb configuration propertie {useNewUrlParser: true}
let connectionString =
    'mongodb+srv://todoAppUser:todoAppUser@cluster0.qnxwm.mongodb.net/TodoApp?retryWrites=true&w=majority';

mongodb.connect(
    connectionString,
    { useNewUrlParser: true, useUnifiedTopology: true },
    function (err, client) {
        db = client.db();
        app.listen(port); // para que empiece a escuchar ya que se haya establecido la conexión y asignado la variable (porque la variable se va a asignar hasta que se haya establecido la conexión)
    }
);

app.use(express.json()); // lo mismo que abajo pero también para asynchronous request, para acceder al texto del "editar entrada"
// configura el express-framework para que incluya un body-object en el request-object
//  para que todas las form values se pongan en el body-object y que después añada el body-object al request-object
// ( para que sea facil acceder a la información que manden en las form )
app.use(express.urlencoded({ extended: false }));

// SECURITY

// 'WWW-Authenticate' para que el browser pida la autorización
// 2° parametro es para darle un nombre a la App
// status(401) codigo http que significa NO AUTORIZADO
function passwordProtected(req, res, next) {
    res.set('WWW-Authenticate', 'Basic realm="Simple To Do App"');
    console.log(req.headers.authorization);
    if (req.headers.authorization == 'Basic YXJpZWw6Z29kb3k=') {
        next();
    } else {
        res.status(401).send('Authorization required');
    }
}

// security
// para que pida el PW en todos los url's
app.use(passwordProtected);

// para decirle a la app que debe hacer cuando reciba un incomming-request a el url del homepage
// o sea pa cuando reciba un get request
// el parametro "items" de la función del método .toArray va a ser un array de todos los items de la base de datos
app.get('/', function (req, res) {
    db.collection('items')
        .find()
        .toArray(function (err, items) {
            res.send(`<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Simple To-Do App</title>
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/css/bootstrap.min.css" integrity="sha384-GJzZqFGwb1QTTN6wy59ffF1BuGJpLSa9DkKMp0DgiMDm4iYMj70gZWKYbI706tWS" crossorigin="anonymous">
    </head>
    <body>
      <div class="container"> 
        <h1 class="display-4 text-center py-1">To-Do App</h1>
        
        <div class="jumbotron p-3 shadow-sm">
          <form id='create-form' action="/create-item" method="POST"> <!-- 🔹🔹 action : a donde manda el req 🔹🔹 -->
            <div class="d-flex align-items-center">
              <input id='create-field' name="item" autofocus autocomplete="off" class="form-control mr-3" type="text" style="flex: 1;">
              <button class="btn btn-primary">Add New Item</button>
            </div>
          </form>
        </div>
        
        <ul id='item-list' class="list-group pb-5">
        <!-- BORRADO PARA LO DE CLIENT SIDE RENDERING
          ${items
              .map(function (item) {
                  return `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
                  <span class="item-text">${item.text}</span>
                  <div>
                    <button data-id="${item._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
                    <button data-id="${item._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
                  </div>
                </li>`;
              })
              .join('')} -->
        </ul>
        
      </div>

      <script> <!-- CLIENT SIDE RENDERING -->
              let items = ${JSON.stringify(items)} 
      </script>

      <script src="https://unpkg.com/axios/dist/axios.min.js"></script> <!-- 🔹🔹 para q tengamos disponible la librería axios 🔹🔹 -->

      <script src='/browser.js'></script>
      
    </body>
    </html>`);
        });
});

// // lo que se va a hacer cuando el web browser mande un post-request a "/create-item"
// app.post('/create-item', function (req, res) {
//     //console.log(req.body.item); // item es el nombre q le di al input (<input name="item")

//     // para crear un documento en mongoDB
//     // segundo parametro es la fcn que se va a llamar cuando se cree el documento en la base de datos
//     db.collection('items').insertOne({ text: req.body.item }, function () {
//         res.redirect('/');
//     });
// });

// lo anterior pero a través de axios
app.post('/create-item', function (req, res) {
    //console.log(req.body.item); // item es el nombre q le di al input (<input name="item")

    // para crear un documento en mongoDB
    // segundo parametro es la fcn que se va a llamar cuando se cree el documento en la base de datos
    let safeText = sanitizeHTML(req.body.text, {
        allowedTags: [],
        allowedAttributes: {},
    });
    db.collection('items').insertOne({ text: safeText }, function (err, info) {
        // en el info está la información del item que se creó
        // res.send('Success'); //para informar a axios que si jaló
        res.json(info.ops[0]); //info tiene un array q se llama ops y el primer elemento es un javascript object que representa el nuevo documento que se creó
    });
});

// para hacer el update
// ==================================

// .findOneAndUpdate(a,b,c)
// a: que documento quremos update (ocupamos el id) , en el html hay un data-id="${item._id}" que pone dinámicamente el id del item en el html y así accedemos al item que queremos cambiar
// b: que queremos update en ese document
// 	{$set: {campo o propiedad que quiero actualizar: el valor al que se va a actualizar}}
// c: función que se va a llamar cuando la acción .findOneAndUpdate() se complete, sirve para poner una función que envíe una respuesta al browser cuando la acción en la base de datos se complete
// new mongodb.ObjectID(req.body.id) es simplemente la forma en la que hay que ingresar las id
app.post('/update-item', function (req, res) {
    let safeText = sanitizeHTML(req.body.text, {
        allowedTags: [],
        allowedAttributes: {},
    });
    // console.log(req.body.text); // ✨✨✨
    db.collection('items').findOneAndUpdate(
        { _id: new mongodb.ObjectID(req.body.id) },
        { $set: { text: safeText } },
        function () {
            res.send('Success');
        }
    );
}); // aquí el express server recibe el incoming post-request al url '/update-item'

// ✨✨✨ imprime en la consola de node, 💡💡💡 req.body es la info que el axios req está mandando , 💡💡💡 req.body.text es el {text: } que mandamos de axios.post()

// ✨🔹🔺🦠⚪🎉🌹🎶🎲💥✔
// 1° enviar la info al node server con lo de browser.js (enviar el valor tipeado al node server)

// 2° node server update la info en mongodb con lo del app.post de arriba

// EL ""app.post('/update-item', function (req, res) {... "" DE ACÁ ARRIBA ES EL QUE ESCUCHA POR POST REQUESTS A ""/update-item"", EL POST-REQUEST LO HACE ""axios.post('/update-item', {..."" DEL OTRO ARCHIVO

// lo mismo con el de abajo, este app.post escucha al post-request del axios del otro archivo
app.post('/delete-item', function (req, res) {
    db.collection('items').deleteOne(
        { _id: new mongodb.ObjectID(req.body.id) },
        function () {
            res.send('Success');
        }
    );
});
