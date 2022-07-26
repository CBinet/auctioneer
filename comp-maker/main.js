document.addEventListener('DOMContentLoaded', (event) => {

    let dragSrcEl = this;

    function handleDragStart(e) {
        this.style.opacity = '0.4';

        dragSrcEl = this;

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDrop(e) {
        e.stopPropagation();

        if (dragSrcEl !== this) {
            dragSrcEl.innerHTML = this.innerHTML;
            this.innerHTML = e.dataTransfer.getData('text/html');
        }

        return false;
    }

    function handleDragEnd(e) {
        this.style.opacity = '1';

        items.forEach(function (item) {
            item.classList.remove('over');
            item.classList.remove('active')
        });

        document.getElementById('selection').innerHTML = ''
    }

    function handleDragOver(e) {
        e.preventDefault();
        return false;
    }

    function handleDragEnter(e) {
        this.classList.add('over');
    }

    function handleDragLeave(e) {
        this.classList.remove('over');
    }

    function handleClick(e) {
        console.log('clicked', e.target);
        document.querySelectorAll('.box.active').forEach(e => e.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById('selection').innerHTML = e.target.innerHTML;
    }

    function addCheckBox(e) {
        e.innerHTML = `<input type="checkbox" checked="true">` + e.innerHTML;
        const checkbox = e.querySelectorAll('input')[0];
        checkbox.addEventListener('change', (x) => {
            if (checkbox.checked) {
                e.classList.remove('disabled');
            } else {
                e.classList.add('disabled');
            }
        });
    }

    let items = document.querySelectorAll('.container .box');
    items.forEach(function (item) {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('click', handleClick);
        addCheckBox(item);
    });
});