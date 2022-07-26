class Application {

    static data = {
        Name: 'Paul',
        Level: 12
    }
    static _onchangeSubscribers = [];

    static onchange(callback) {
        this._onchangeSubscribers = [];
        this._onchangeSubscribers.push(callback);
    }

    static refresh(data) {
        if (data) this.data = { ...this.data, ...data };
        this._onchangeSubscribers.forEach(sub => sub(this.data));
    }
}

export { Application }
