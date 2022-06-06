var taskNameText = document.getElementById('task-name-text')

function initialize () {
  taskNameText.addEventListener('mouseenter', function () {
    update()
  })

  ipc.on('toggleCollapsed', toggle)

  taskNameText.addEventListener('click', toggle)
}

function toggle(){
  tasks.getSelected().collapsed = !tasks.getSelected().collapsed
  update()
}

function update (){
  taskNameText.innerText = tasks.getPrintedName(tasks.getSelected().id)
  taskNameText.style.opacity = tasks.getSelected().collapsed ? 0.3 : 1.0
}

module.exports = { initialize, update }
