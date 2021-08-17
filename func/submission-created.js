const fetch = require("node-fetch");

const { API_ENDPOINT, MAX_EMBED_FIELD_CHARS, MAX_EMBED_FOOTER_CHARS } = require("./helpers/discord-helpers.js");
const { createJwt, decodeJwt } = require("./helpers/jwt-helpers.js");
const { getBan } = require("./helpers/user-helpers.js");

exports.handler = async function (event, context) {
    let payload;

    if (process.env.USE_NETLIFY_FORMS) {
        payload = JSON.parse(event.body).payload.data;
    } else {
        if (event.httpMethod !== "POST") {
            return {
                statusCode: 405
            };
        }

        const params = new URLSearchParams(event.body);
        payload = {
            banReason: params.get("banReason") || undefined,
            appealText: params.get("appealText") || undefined,
            futureActions: params.get("futureActions") || undefined,
            token: params.get("token") || undefined
        };
    }

    if (payload.banReason !== undefined &&
        payload.appealText !== undefined &&
        payload.futureActions !== undefined && 
        payload.token !== undefined) {
        
        const userInfo = decodeJwt(payload.token);
        const BlockedUsers = ["158053884999368711", "263558768040607746", "382719444411088896", "681856964854153229", "106553425877020672", "112355261401829376", "850432415834832896", "334863727956328459", "584970279130759209", "691095783151501434", "629086247125778482", "325779009231126538", "304932420136992769", "139937562964787200", "546419002134495273", "230758765765328897", "143541012369768448", "244965502483562507", "292052006900596739", "378039965503717376", "278638800006021122", "106548735575621632", "196225248960446464", "138985535216549888", "276801602206040074", "735960905799696504", "377664990242668545", "851871414708469851", "193990475978375168", "209593785938739200", "211741865546874880", "93137234001154048", "193604815324971008", "193604816113500160", "85265468679548928", "190248989063512065", "850440386987687998", "856314166921658369", "161288946658181130", "389524499579797505", "188513404162539520", "263558768040607746", "829934091284512809", "151519825435295744", "232644402663653383",];
        if (BlockedUsers.indexOf(userInfo.id) > -1)
        {
            return {
                statusCode: 303,
                headers: {
                    "Location": "/banned"
                }
            };
        }
        const message = {
            embed: {
                title: "New appeal submitted!",
                timestamp: new Date().toISOString(),
                fields: [
                    {
                        name: "Submitter",
                        value: `${userInfo.username}#${userInfo.discriminator} (ID: ${userInfo.id})`
                    },
                    {
                        name: "Why were you banned?",
                        value: payload.banReason.slice(0, MAX_EMBED_FIELD_CHARS)
                    },
                    {
                        name: "Why do you feel you should be unbanned?",
                        value: payload.appealText.slice(0, MAX_EMBED_FIELD_CHARS)
                    },
                    {
                        name: "What will you do to avoid being banned in the future?",
                        value: payload.futureActions.slice(0, MAX_EMBED_FIELD_CHARS)
                    }
                ]
            }
        }

            try {
                const ban = await getBan(userInfo.id, process.env.GUILD_ID, process.env.DISCORD_BOT_TOKEN);
                if (ban !== null && ban.reason) {
                    message.embed.footer = {
                        text: `Original ban reason: ${ban.reason}`.slice(0, MAX_EMBED_FOOTER_CHARS)
                    };
                }
            } catch (e) {
                console.log(e);
            }

        const result = await fetch(`${API_ENDPOINT}/channels/${encodeURIComponent(process.env.APPEALS_CHANNEL)}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`
            },
            body: JSON.stringify(message)
        });

        if (result.ok) {
            if (process.env.USE_NETLIFY_FORMS) {
                return {
                    statusCode: 200
                };
            } else {
                return {
                    statusCode: 303,
                    headers: {
                        "Location": "/success"
                    }
                };
            }
        } else {
            console.log(await result.json());
            throw new Error("Failed to submit message");
        }
    }

    return {
        statusCode: 400
    };
}
