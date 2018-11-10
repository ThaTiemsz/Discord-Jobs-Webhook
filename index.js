const { WebhookClient, RichEmbed } = require("discord.js")
const fs = require("fs-extra")
const config = require("./config")
const webhook = new WebhookClient(config.id, config.token, { disableEveryone: true })
const request = require("request-promise-native")
const he = require("he")
const cheerio = require("cheerio")

const truncate = (str) => str.length > 1024 ? str.substr(0, 1000) + "....." : str
const assets = {
    ASSET_JOB_CHART: "https://i.imgur.com/Ts8c5oQ.png",
    JOBS_ROLE_BD: "https://i.imgur.com/Wy8kbg3.png",
    JOBS_ROLE_DESIGN: "https://i.imgur.com/wmH8qu0.png",
    JOBS_ROLE_ENGINEERING: "https://i.imgur.com/GEMMdNP.png",
    JOBS_ROLE_GENERAL: "https://i.imgur.com/qyIk6PT.png",
    JOBS_ROLE_MARKETING: "https://i.imgur.com/Jtlevcd.png",
    JOBS_ROLE_PEOPLE: "https://i.imgur.com/6JcQCrP.png",
    JOBS_ROLE_CX: "https://i.imgur.com/rMjxLti.png"
}
const image = (team) => {
    team = team.trim()
    switch (team) {
        case "Business Development":
            return assets.JOBS_ROLE_BD
        case "Engineering":
            return assets.JOBS_ROLE_ENGINEERING
        case "Design":
        case "Product":
            return assets.JOBS_ROLE_DESIGN
        case "Marketing":
            return assets.JOBS_ROLE_MARKETING
        case "HR":
            return assets.JOBS_ROLE_PEOPLE
        case "Accounting":
            return assets.ASSET_JOB_CHART
        case "Customer Experience":
            return assets.JOBS_ROLE_CX
        default:
            return assets.JOBS_ROLE_GENERAL
    }
}
const colors = {
    Added: 7506394,
    Removed: 11143176
}
const delay = 600000 // 10 mins

console.log("[WEBHOOK] Ready!")

const interval = () => {
    request.get("https://api.greenhouse.io/v1/boards/discord/jobs?content=true", { json: true }).then(async _res => {
        // read and write stuff
        const _data = await fs.readJson("./data.json")
        const write = await fs.writeJson("./data.json", _res)
        if (_res !== _data) writeSeparate = await fs.writeJson(`./data/${new Date().toJSON().substr(0,16).replace(":", ".")}Z.json`, _res)

        const res = _res.jobs
        const data = _data.jobs
        
        // calculate the difference
        const mapRes = res.map((x, i) => [x.id, i])
        const mapData = data.map((x, i) => [x.id, i])
        Array.prototype.exists = function (id) { return this.some(x => x[0] === id) }
        const mapAdded = mapRes.filter(x => mapData.exists(x[0]) === false)
        const mapRemoved = mapData.filter(x => mapRes.exists(x[0]) === false)

        // job was removed
        for (const jobArr of mapRemoved) {
            console.log("[JOB] Opening Removed")
            const job = data[jobArr[1]]
            const status = "Removed"
            const $ = cheerio.load(he.decode(job.content))
            const description = $("h2").text()

            const embed = new RichEmbed()
             .setAuthor(job.title, image(job.departments[0].name))
             .setColor(colors[status])
             .setDescription(truncate(description))
             .setFooter(`${job.departments[0].name}`)
             .setTimestamp(new Date(job.updated_at))
            
            webhook.send(`\`[Job Opening ${status}]\``, { embeds: [embed] })
             .then(msg => console.log("[WEBHOOK] Message sent!"))
             .catch(console.error)
        }

        // job was added
        for (const jobArr of mapAdded) {
            console.log("[JOB] Opening Added")
            const job = res[jobArr[1]]
            const status = "Added"
            const $ = cheerio.load(he.decode(job.content))
            const description = $("h2").text()
            const lists = $("ul").map((i, el) => $(el).children("li").map((i, el) => $(el).text()))
            const listOne = lists.get(0).toArray().map(l => `- ${l}`).join("\n")
            const listTwo = lists.get(1).toArray().map(l => `- ${l}`).join("\n")

            const embed = new RichEmbed()
             .setAuthor(job.title, image(job.departments[0].name), job.absolute_url)
             .setColor(colors[status])
             .setDescription(truncate(description))
             .addField("What you'll be doing", truncate(listOne))
             .addField("What you should have", truncate(listTwo))
             .setFooter(`${job.departments[0].name}`)
             .setTimestamp(new Date(job.updated_at))
            
            webhook.send(`\`[Job Opening ${status}]\``, { embeds: [embed] })
             .then(msg => console.log("[WEBHOOK] Message sent!"))
             .catch(console.error)
        }
    }).catch(err => console.error("[ERROR]", err))
    setTimeout(interval, delay)
}
interval()

process.on("unhandledRejection", err => console.log(err))