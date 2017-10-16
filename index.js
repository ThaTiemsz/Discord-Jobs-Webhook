const { WebhookClient, RichEmbed } = require("discord.js")
const fs = require("fs-extra")
const config = require("./config")
const data = require("./data.json")
const webhook = new WebhookClient(config.id, config.token, { disableEveryone: true })
const request = require("request-promise-native")
const requestOG = require("request")

const decodeHTMLEntities = (str) => str.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
const convertHTML = (str) => str.replace(/<li>/gi, "- ").replace(/<\/li>/gi, "\n").replace(/<b>|<\/b>|<strong>|<\/strong>/gi, "**").replace(/<i>|<\/i>|<em>|<\/em>/gi, "_").replace(/<u>|<\/u>/gi, "__")
const truncate = (str) => str.length > 1024 ? str.substr(0, 1000) + "....." : str
/* const host = "https://discordapp.com/assets/"
const assets = {
    ASSET_JOB_CHART: host + "6abf8959c84b6a155343ca7e001ce83e.png",
    JOBS_ROLE_BD: host + "df48fb3407fc42f239084d9f553249af.svg",
    JOBS_ROLE_DESIGN: host + "f2fb411e9d9a7ba0fe7f4f385b91887d.svg",
    JOBS_ROLE_ENGINEERING: host + "06a7b4d2f8111c156ef1c3db98284421.svg",
    JOBS_ROLE_GENERAL: host + "08ced1076c17e9e85906f5b26736f65d.svg",
    JOBS_ROLE_MARKETING: host + "e3a5bd1f9708187dd4a7e6df8d490051.svg",
    JOBS_ROLE_PEOPLE: host + "d4d8f376e23cdcd7a69d7ea47a5179c4.svg",
    JOBS_ROLE_CX: host + "3f545a2ee90562b688cf1fe62a9fc10a.svg"
} SVG icons don't work in Discord embeds */
const host = "https://drive.google.com/uc?export=view&id="
const assets = {
    ASSET_JOB_CHART: host + "0ByItrFqbLRC0b005ODl0OHJKcVk",
    JOBS_ROLE_BD: host + "0ByItrFqbLRC0V05DTkx3cFZ6OEk",
    JOBS_ROLE_DESIGN: host + "0ByItrFqbLRC0bEVSMkx0cl9qbnc",
    JOBS_ROLE_ENGINEERING: host + "0ByItrFqbLRC0S3NydFlMSGNkLTg",
    JOBS_ROLE_GENERAL: host + "0ByItrFqbLRC0eGVvdmxtNV9wLUE",
    JOBS_ROLE_MARKETING: host + "0ByItrFqbLRC0ZE96ZHZiUE1BUms",
    JOBS_ROLE_PEOPLE: host + "0ByItrFqbLRC0VjJfV0gxODgtOGM",
    JOBS_ROLE_CX: host + "0ByItrFqbLRC0amdxVE03anlndlU"
}
const image = (team) => {
    switch (team) {
        case "Business Development":
            return assets.JOBS_ROLE_BD
        case "Engineering":
            return assets.JOBS_ROLE_ENGINEERING
        case "Product":
            return assets.JOBS_ROLE_DESIGN
        case "Marketing":
            return assets.JOBS_ROLE_MARKETING
        case "HR":
            return assets.JOBS_ROLE_PEOPLE
        case "Accounting":
            return assets.ASSET_JOB_CHART
        case "Community":
            return assets.JOBS_ROLE_CX
        default:
            return assets.JOBS_ROLE_GENERAL
    }
}
const colors = {
    Added: 7506394,
    Removed: 11143176
}
const delay = 60000

console.log("[WEBHOOK] Ready!")

setInterval(() => {
    request.get("https://api.lever.co/v0/postings/discordapp?mode=json", { json: true }).then(async res => {
        const data = await fs.readJson("./data.json")
        const write = await fs.writeJson("./data.json")
        
        const mapRes = res.map((x, i) => [x.id, i])
        const mapData = data.map((x, i) => [x.id, i])
        Array.prototype.exists = function (id) { return this.some(x => x[0] === id) }
        const mapAdded = mapRes.filter(x => mapData.exists(x[0]) === false)
        const mapRemoved = mapData.filter(x => mapRes.exists(x[0]) === false)

        for (const jobArr of mapRemoved) {
            console.log("[JOB] Opening Removed")
            const job = data[jobArr[1]]
            const status = "Removed"
            const embed = new RichEmbed()
             .setAuthor(job.text, image(job.categories.team), job.hostedUrl)
             .setColor(colors[status])
             .setDescription(truncate(job.descriptionPlain))
             .setFooter(`${job.categories.team} (${job.categories.commitment})`)
             .setTimestamp(new Date(job.createdAt))
            
            webhook.send(`\`[Job Opening ${status}]\``, { embeds: [embed] })
             .then(msg => console.log("[WEBHOOK] Message sent!"))
             .catch(console.error)
        }

        for (const jobArr of mapAdded) {
            console.log("[JOB] Opening Added")
            const job = res[jobArr[1]]
            const status = "Added"
            const embed = new RichEmbed()
             .setAuthor(job.text, image(job.categories.team), job.hostedUrl)
             .setColor(colors[status])
             .setDescription(truncate(job.descriptionPlain))
             .addField(job.lists[0].text, truncate(convertHTML(job.lists[0].content)))
             .addField(job.lists[1].text, truncate(convertHTML(job.lists[1].content)))
             .setFooter(`${job.categories.team} (${job.categories.commitment})`)
             .setTimestamp(new Date(job.createdAt))
            
            webhook.send(`\`[Job Opening ${status}]\``, { embeds: [embed] })
             .then(msg => console.log("[WEBHOOK] Message sent!"))
             .catch(console.error)
        }
    }).catch(err => console.error("[ERROR]", err))
}, delay)

process.on("unhandledRejection", err => console.log(err))