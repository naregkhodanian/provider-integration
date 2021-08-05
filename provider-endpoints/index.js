const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello World');
});

// Provider to return all offer details based on customer address
app.post('/offer-details', (req, res) => {
    let body = req.body;
    if (body.street && body.city && body.zip && body.state) {

        let raw_offers = fs.readFileSync('./db/offers.json');
        let offers = JSON.parse(raw_offers);



        res.status(200).json({
            success: true,
            message: offers
        });
    }

    else {
        res.status(404).json({
            success: false,
            message: 'A valid address was not provided.'
        });
    }
});

// Provider to determine customer eligibility 
app.post('/offer-eligibility', (req, res) => {
    let body = req.body;
    if (body.unique_id && body.first_name && body.last_name && body.income_band) {

        let raw_offers = fs.readFileSync('./db/offers.json');
        let offers = JSON.parse(raw_offers);

        if (offers.filter(i => i.unique_id == body.unique_id).length > 0) {
            res.status(200).json({
                success: true,
                message: 'You are eligibile for this service.'
            });
        }

        else {
            res.status(404).json({
                success: false,
                message: 'Offer was not found.'
            });
        }
    }

    else {
        res.status(404).json({
            success: false,
            message: 'You are not eligibile for this offer.'
        });
    }
});

// Provider to confirm installment schedule. This cannot be prior to the current date.
app.post('/offer-placement', (req, res) => {
    let body = req.body;
    if (body.unique_id && body.date && body.time) {

        let raw_offers = fs.readFileSync('./db/offers.json');
        let offers = JSON.parse(raw_offers);

        let date_time = new Date(body.date + ' ' + body.time + ' GMT-0800');
        let epoch = Number(date_time);
        let current_date_time_epoch = Number(Date.now());


        if ((offers.filter(i => i.unique_id == body.unique_id).length > 0) && (current_date_time_epoch < epoch)) {
            res.status(200).json({
                success: true,
                message: 'You are confirmed for installation.'
            });
        }

        else {
            res.status(404).json({
                success: false,
                message: 'We have no installations available for that date.'
            });
        }
    }

    else {
        res.status(404).json({
            success: false,
            message: 'You are not confirmed for installation.'
        });
    }
});

app.listen(port, () => {
    console.log('Provider online...')
});