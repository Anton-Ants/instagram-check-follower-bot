const Instagram = require('instagram-web-api')
const FileCookieStore = require('tough-cookie-filestore2')
const { Telegraf } = require('telegraf')
const config = require('config');

const username = config.get('Customer.instagramConfig.username')
const password = config.get('Customer.instagramConfig.password')
const key = config.get('Customer.botConfig.key')
const bot = new Telegraf(key)



const cookieStore = new FileCookieStore('./cookies.json')
const client = new Instagram({
  username,
  password,
  cookieStore
})

console.log('Bot started...');

bot.start(ctx => ctx.reply(`
  Hi ${ctx.from.first_name}!
  Here you can check, which of your subscribers does not follow you back.

  Just send bot your "username"
  /help.
`))
bot.help(ctx => ctx.reply('Just send bot your "username"'))
bot.on('text', async (ctx) => {
  try {
    const userText = ctx.message.text

    ;(async () => {

      await client.login()

      let user

      try {
        user = await client.getUserByUsername({
          username: userText
        })
      } catch (e) {
        ctx.reply('Сheck the username you wrote')
        return
      }

      const loadingInPercent = function(a, b) {
          return `${Math.floor(a * 100 / b)}%`;
      };

      const userId = user.id
      const followingsCount = user.edge_follow.count
      const followersCount = user.edge_followed_by.count

      let followings = []
      let followers = []

      const countUsersOnPage = 30;
      const totalCountFollowersAndFollowings = followingsCount + followersCount

      const msgInfo = await ctx.reply('0%')

      const getFollowingsFirstList = await client.getFollowings({
        userId: userId,
        first: countUsersOnPage
      })
      let has_next_page = getFollowingsFirstList.page_info.has_next_page
      let end_cursor = getFollowingsFirstList.page_info.end_cursor

      followings = followings.concat(getFollowingsFirstList.data)
      let currentCountFollowersAndFollowings = followings.length + followers.length;
      ctx.telegram.editMessageText(
        msgInfo.chat.id,
        msgInfo.message_id,
        msgInfo.message_id,
        loadingInPercent(currentCountFollowersAndFollowings,totalCountFollowersAndFollowings),
      )

      while (has_next_page) {

        const getFollowings = await client.getFollowings({
          userId: userId,
          first: countUsersOnPage,
          after: end_cursor
        })

        followings = followings.concat(getFollowings.data)
        has_next_page = getFollowings.page_info.has_next_page
        end_cursor = getFollowings.page_info.end_cursor

        currentCountFollowersAndFollowings = followings.length + followers.length

        ctx.telegram.editMessageText(
          msgInfo.chat.id,
          msgInfo.message_id,
          msgInfo.message_id,
          loadingInPercent(currentCountFollowersAndFollowings,totalCountFollowersAndFollowings),
        )
      }

      const getFollowersFirstList = await client.getFollowers({
        userId: userId,
        first: countUsersOnPage
      })
      has_next_page = getFollowersFirstList.page_info.has_next_page
      end_cursor = getFollowersFirstList.page_info.end_cursor

      followers = followers.concat(getFollowersFirstList.data)
      currentCountFollowersAndFollowings = followings.length + followers.length

      ctx.telegram.editMessageText(
        msgInfo.chat.id,
        msgInfo.message_id,
        msgInfo.message_id,
        loadingInPercent(currentCountFollowersAndFollowings,totalCountFollowersAndFollowings),
      )

      while (has_next_page) {

        const getFollowers = await client.getFollowers({
          userId: userId,
          first: countUsersOnPage,
          after: end_cursor
        })

        followers = followers.concat(getFollowers.data)
        has_next_page = getFollowers.page_info.has_next_page
        end_cursor = getFollowers.page_info.end_cursor
        currentCountFollowersAndFollowings = followings.length + followers.length
        ctx.telegram.editMessageText(
          msgInfo.chat.id,
          msgInfo.message_id,
          msgInfo.message_id,
          loadingInPercent(currentCountFollowersAndFollowings,totalCountFollowersAndFollowings),
        )
      }

      console.log({
        followingscount: followings.length
      });
      console.log({
        followerscount: followers.length
      });

      let followingsId = []
      let followersId = []
      let notFollowMe = []

      for (var i = 0; i < followings.length; i++) {
        if (followings[i].id !== undefined) {
          followingsId.push(followings[i].id)
        } else {
          console.log(followings[i]);
        }
      }

      for (var i = 0; i < followers.length; i++) {
        if (followers[i].id !== undefined) {
          followersId.push(followers[i].id)
        } else {
          console.log(followersId[i]);
        }
      }

      let intersection = followingsId.filter(x => !followersId.includes(x));

      followings.forEach(element => {

        if (intersection.indexOf(element.id) !== -1) {
          notFollowMe.push({
            id: element.id,
            username: element.username,
            full_name: element.full_name,
            url: `https://www.instagram.com/${element.username}/`
          })
        }
      });

      let subscriberData = ''
      let n = 0;

      notFollowMe.forEach(subscriber => {
        n++
        subscriberData += `#${n} Url: ${subscriber.url} \n`

        if (subscriberData.length > 3800) {
            ctx.reply(subscriberData)
            subscriberData = ''
        }

      });

      var fs = require('fs');
      fs.writeFile(`userLog/${userText}_${Date.now()}.json`, JSON.stringify(notFollowMe), function(err) {
        if (err) throw err;
        console.log('complete');
      });

      ctx.reply(subscriberData)

    })()

  } catch (e) {
    ctx.reply('No such account exists. Please check the correctness of the entered data')
  }
})
bot.launch()
