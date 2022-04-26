var taskNameText = document.getElementById('task-name-text')

function initialize () {
  taskNameText.addEventListener('mouseenter', function () {
    update()
  })
}

function update (){
  taskNameText.innerText = tasks.getPrintedName(tasks.getSelected().id)
}

module.exports = { initialize, update }
