const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const { countReset } = require('console');
const { response } = require('express');
const { lookup } = require('dns');
const app = express();
const port = 3001;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Send a POST request to get offers from provider using the :3000/offer-details endpoint. This request should include street, city, state, or zip otherwise the request is not valid and should not hit the provider endpoint. If it is invalid, send a 400 error.
app.post('/offer-details', (req, res) => {
    let body = req.body;
    if (body.street && body.city && body.zip && body.state) {
        let ID = Math.random().toString(36).substr(2, 9);
        axios.post('http://localhost:3000/offer-details', {
            street: body.street,
            city: body.city,
            zip: body.zip,
            state: body.state,
        }).then(function (response) {
            const session = {
                session_id: ID,
                address: body.street + ', ' + body.city + ', ' + body.state + ' ' + body.zip,
                offers: response.data.message,
                timestamp: Number(Date.now())
            }

            const session_json = JSON.stringify(session);

            fs.writeFile('./sessions/' + ID + '.json', session_json, err => {
                if (err) {
                    console.log(error);
                }

                else {
                    console.log('File saved')
                }
            })
            res.status(200).json({
                success: true,
                offers: response.data.message,
                session_id: session.session_id
                // address: body.street + ', ' + body.city + ', ' + body.state + ' ' + body.zip
            });
        }).catch(function (error) {
            console.log(error)
            res.status(404).json({
                success: false,
                message: error.response.data.message
            });
        });

    }

    else {
        res.status(404).json({
            success: false,
            message: 'A valid address was not provided.'
        });
    }
});

// Send a POST request to receive customer eligibility by using the :3000/offer-eligibility endpoint. This request should include unique_id, first_name, last_name, and income_band. If a customer is eligible, let's begin creating an order, allowing us to store how far this customer has come to completing their purchase and what offers they have been registered as eligible for. If a customer is not eligible, let them know. 
app.post('/offer-eligibility', (req, res) => {
    let body = req.body;
    if (body.unique_id && body.first_name && body.last_name && body.income_band && body.session_id) {
        let ID = Math.random().toString(36).substr(2, 9);
        let session = lookupSessionOffer(body.session_id, body.unique_id);
        axios.post('http://localhost:3000/offer-eligibility', {
            unique_id: body.unique_id,
            first_name: body.first_name,
            last_name: body.last_name,
            income_band: body.income_band,
        }).then(function (response) {
            const order = {
                order_id: ID,
                session_id: session.session_id,
                first_name: body.first_name,
                last_name: body.last_name,
                income_band: body.income_band,
                address: session.address,
                selected_offer: session.selected_offer,
                eligibility: true
            }

            const order_json = JSON.stringify(order);

            fs.writeFile('./orders/' + ID + '.json', order_json, err => {
                if (err) {
                    console.log(error);
                }

                else {
                    console.log('File saved')
                }
            })

            res.status(200).json({
                success: true,
                message: response.data.message,
                order_id: ID,
                session_id: order.session_id
            });
        }).catch(function (error) {
            console.log(error);
            res.status(404).json({
                success: false,
                message: error.response.data.message
            });
        });

    }

    else {
        res.status(404).json({
            success: false,
            message: 'A valid address was not provided.'
        });
    }
});

// Send a POST request to receive placement information by using the :3000/offer-placement endpoint. This request should include unique_id, date, and time. If a placement is accepted, let's save the order status using our internal /store-order endpoint.
app.post('/offer-placement', (req, res) => {
    let body = req.body;
    if (body.unique_id && body.date && body.time && body.order_id) {
        let order = lookupOrder(body.order_id);
        axios.post('http://localhost:3000/offer-placement', {
            unique_id: body.unique_id,
            date: body.date,
            time: body.time,
        }).then(function (response) {
            let date_time = new Date(body.date + ' ' + body.time + ' GMT-0800');
            let epoch = Number(date_time);

            order.installation = {
                confirmation: true,
                date_time: epoch,
            }

            const order_json = JSON.stringify(order);

            fs.writeFile('./orders/' + body.order_id + '.json', order_json, err => {
                if (err) {
                    console.log(error);
                }

                else {
                    console.log('File saved')
                }
            })

            res.status(200).json({
                success: true,
                message: response.data.message,
                order_id: body.order_id,
            });
        }).catch(function (error) {
            console.log(error);
            res.status(404).json({
                success: false,
                message: error.response.data.message
            });
        });

    }

    else {
        res.status(404).json({
            success: false,
            message: 'A valid address was not provided.'
        });
    }
});

function lookupSessionOffer(session_id, unique_id) {
    let raw_session = fs.readFileSync('./sessions/' + session_id + '.json');
    let session = JSON.parse(raw_session);
    session.selected_offer = session.offers.filter(a => a.unique_id == unique_id)
    return session;
}

function lookupOrder(order_id) {
    let raw_order = fs.readFileSync('./orders/' + order_id + '.json');
    let order = JSON.parse(raw_order);
    return order;
}


app.listen(port, () => {
    console.log('Updater online...')
});