var taskNameText = document.getElementById('task-name-text')

function initialize () {
  taskNameText.addEventListener('mouseenter', function () {
    update()
  })
}

function update (){
  if (tasks.getSelected().name) {
    taskNameText.innerText = tasks.getSelected().name
  }
  else {
    taskNameText.innerText = l('defaultTaskName').replace('%n', tasks.getIndex(tasks.getSelected().id) + 1)
  }

}

module.exports = { initialize, update }
