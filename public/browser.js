let itemTemplate = function (item) {
    return `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
        <span class="item-text">${item.text}</span>
        <div>
          <button data-id="${item._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
          <button data-id="${item._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
        </div>
    </li>`;
};

// CLIENT SIDE RENDERING
// initial page load
let ourHTML = items.map(item => itemTemplate(item)).join('');
document.getElementById('item-list').insertAdjacentHTML('beforeend', ourHTML);

// Create feature (para crear directo sin hacer reload)
let createField = document.getElementById('create-field');

document.getElementById('create-form').addEventListener('submit', function (e) {
    e.preventDefault();
    axios
        .post('/create-item', {
            text: createField.value,
        })
        .then(function (respuestaDelServer) {
            // crea el HTML para el elemnto nuevo una vez el servidor mande la notificación de que se actualizó la BD
            document.getElementById('item-list').insertAdjacentHTML(
                'beforeend',
                itemTemplate(respuestaDelServer.data)
                //respuestaDelServer.data es el object que se mandó que representa el nuevo documento que se creó
            );
            createField.value = '';
            createField.focus();
        })
        .catch(function () {
            console.log('Please try again later');
        });
});

document.addEventListener('click', function (e) {
    // Update feature
    if (e.target.classList.contains('edit-me')) {
        let userInput = prompt(
            'Enter your desired new text',
            e.target.parentElement.parentElement.querySelector('.item-text')
                .innerHTML //para q esté prellenado con lo anterior
        );
        if (userInput) {
            // 🎶🦠📌
            axios // axios.post() para enviar la info a nuestro node-server (para enviar un post al server)
                .post('/update-item', {
                    text: userInput,
                    id: e.target.getAttribute('data-id'),
                })
                .then(function () {
                    //se va a ejecutar cuando el axios request se complete y el node server va a mandar su respuesta hasta que su darabase action esté completa, esto me sirve para poner el nuevo texto SOLO cuando ya se halla modificado la BD
                    // el e.target es el boton que se picó
                    e.target.parentElement.parentElement.querySelector(
                        '.item-text'
                    ).innerHTML = userInput;
                })
                .catch(function () {
                    console.log('Please try again later');
                });
        }
    }

    // Delete feature
    if (e.target.classList.contains('delete-me')) {
        if (confirm('Are you sure you want to delete this item?')) {
            axios
                .post('/delete-item', {
                    id: e.target.getAttribute('data-id'),
                })
                .then(function () {
                    e.target.parentElement.parentElement.remove();
                })
                .catch(function () {
                    console.log('Please try again later');
                });
        }
    }
});

// 🎶🦠📌 se pone el if() para que mande el request solo si se pone algo, sino, se manda el request vacío y se update la BD a empty string y así queda

// axios manda el request al server
// en el .post() el 1° es url a donde se manda el post-request
// el 2° es la data que se va a mandar (la data que va a recibir el server), la forma que tiene = a la del item en mongodb es por coincidencia, no tiene nada que ver, en lugar de "text:" se pudo llamar de cualquier manera
