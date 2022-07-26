import { Application } from './application.js';

window.onload = () => {

    const navLinks = document.querySelectorAll('a.nav-link');

    let currentRoute = '/workers';
    const routes = {
        ['/workers']: { file: './workers.html' },
        ['/buildings']: { file: './buildings.html' }
    }
    const cachedTemplates = {}

    navLinks.forEach(element => {
        element.addEventListener('click', () => {
            handleNavMenu(element);
            handleRouterNavigation(element);
        });
    })
    navLinks[0].click();
    handleRefreshOnApplicationChange();
    setTimeout(() => {
        Application.refresh({
            Name: 'Martin',
            Level: 66
        })
    }, 5000);

    function handleNavMenu(e) {
        if (e.classList.contains('active')) return;
        navLinks.forEach(_e => _e.classList.remove('active'));
        e.classList.add('active');
    }

    function handleRouterNavigation(e) {
        const route = e.getAttribute('route');
        if (route) {
            currentRoute = route;
            $(function () {
                $("#content").load(routes[route].file, (html) => {
                    cachedTemplates[route] = html;
                    const data = Application.data;
                    for (const property in data) {
                        html = html.replace(`\{\{${property}\}\}`, data[property]);
                    }
                    document.getElementById('content').innerHTML = html;
                });
            });
        }
    }

    function handleRefreshOnApplicationChange() {
        Application.onchange(_data => {
            let html = cachedTemplates[currentRoute];
            for (const property in _data) {
                html = html.replace(`\{\{${property}\}\}`, _data[property]);
            }
            document.getElementById('content').innerHTML = html;
        })
    }
}