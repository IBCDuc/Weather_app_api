var express = require('express')
const morgan = require('morgan')
const app = express()
const port = 5000
const dotenv = require('dotenv')
const path = require('path')
const redis = require("redis")
const ejs = require("ejs")
const limit = require("express-rate-limit")
app.use(morgan('combined'))


app.set('view engine', 'ejs')
app.set('views', path.join(__dirname , './views'))

dotenv.config({path: './.env'})
app.use(express.json())


const limiter = limit({
    windowMs: 15*60*1000,
    limit: 90,
})
app.use(limiter)
const api_key = process.env.API_SECURE_KEY
const api = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/nam%20t%E1%BB%AB%20li%C3%AAm?unitGroup=metric&key=${api_key}&contentType=json`
const redis_port = process.env.PORT_REDIS

//middlewares
const cache = async (req,res, next) => {

    const client = await redis.createClient(redis_port)
        .on('error', err => console.log(err))
        .connect()
   const check = await client.get('weather')
   if (!check) {
    return next()
   } else {
   const arrdays = JSON.parse(check)
    res.render('weather_api', {
        arrdays
        })
    }
}
app.get('/' ,cache,  async (req,res) => {
    try {
        const response = await fetch(api)
        if (!response.ok) {
            throw new Error(`status: ${response}`)
        }
        const json = await response.json()
        day = []
        for (i = 0; i < json.days.length; i++) {
            day.push(json.days[i].datetime)
        }
        const name = json.resolvedAddress
        const date = json.days[0].datetime
        const humidity = json.days[0].humidity
        const temp = json.days[0].temp
        const condition = json.days[0].conditions
        const wind = json.days[0].windspeed

        const arrdays = json.days.slice(0,6)
        
        const client = await redis.createClient({
            port: redis_port// Cổng của Redis
          })
            .on('error', err => console.log('Redis Client Error', err))
            .connect();

       await client.set('weather', JSON.stringify(arrdays), 'EX', 3600 )
        res.render('weather_api', {
            name : name,
            humidity : humidity,
            temp: temp,
            condition: condition, 
            wind : wind,
            date: date,
            arrdays
        })

    } catch (error) {
        console.error(error.message)
    }
})

app.listen(port, () => {
    console.log(`Listen on port ${port}`)
})
