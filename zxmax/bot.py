import json, os, random, time, datetime, io, asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, InputFile, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from PIL import Image, ImageDraw, ImageFont

CHANNEL_URL = "https://t.me/zxmaxuptade"
CHAT_URL = "https://t.me/chatgremoars"

for k in list(os.environ):
    if k.lower().endswith("proxy"):
        del os.environ[k]

FIREBASE_OK = False
try:
    from firebase_client import get_user_by_username, update_user_coins, set_telegram_id, clear_pending_amount
    FIREBASE_OK = True
except Exception as e:
    print(f"[BOT] Firebase import xatosi: {e}")

TOKEN = "8907446962:AAFoWSaWE_J0_cPl8Cvmf8MwCNvKxvx58qc"
WEB_URL = "https://smuratbay957-dot.github.io/zxmax.github.io/zxmax/"
ADMIN_ID = 6154610636
DATA_FILE = "users.json"
BANNED_FILE = "banned.json"
AUCTION_FILE = "auction.json"
BANK_FILE = "bank.json"
GAMES_LIST = [
    ("Xotira o'yini", "Juft kartochkalarni toping", "../games/Xotira%20oyini/index.html"),
    ("Galaxy Tycoon", "Kosmosda pul ishlang", "../games/Galaxy%20tycoon/index.html"),
    ("Snake", "Klassik ilon", "../games/Snake/index.html"),
    ("Tic-Tac-Toe", "AI ga qarshi", "../games/TicTacToe/index.html"),
    ("Son topish", "1-100 oralig'ida", "../games/NumberGuess/index.html"),
    ("Reaksiya testi", "Tezlikni sinang", "../games/Reaksiya/index.html"),
    ("Quiz", "Bilimingizni sinang", "../games/Quiz/index.html"),
    ("Flappy Bird", "Qushni boshqaring", "../games/Flappy%20Bird/index.html"),
    ("Color Match", "Rangni toping", "../games/Color%20Match/index.html"),
    ("Typing Speed", "Tez yozish", "../games/Typing%20Speed/index.html"),
    ("2048", "Bloklarni birlashtiring", "../games/2048/index.html"),
    ("Futbol Penalti", "Penalti tepib tanga yuting", "../games/Futbol%20penalti/index.html"),
]
POLL_FILE = "poll.json"

LANG = {
    "uz": {
        "start_back": "Xush kelibsiz, {name}! 👋\n💰 Bot balansi: {coins} ◎",
        "start_reg": "Ismingizni yozing:",
        "bot_info": "🤖 <b>ZXMAX Bot</b>\n\nBu bot orqali siz tanga yig'ishingiz, o'yin o'ynashingiz va zxmax platformasi bilan bog'lanishingiz mumkin!\n\nPastdagi tugmalar orqali kanal va chatga o'ting:",
        "btn_channel": "📢 Kanal",
        "btn_chat": "💬 Chat",
        "need_start": "Avval /start ni bosing!",
        "balance": "💰 {name}: {coins} ◎",
        "coin_wait": "Kuting {left} soniya ⏳",
        "coin_got": "🎉 +{amount} ◎! Jami: {total} ◎",
        "profile": "👤 <b>Profil</b>\n\nIsm: {name}\nUsername: {username}\nID: <code>{id}</code>\n💰 Bot balansi: {coins} ◎",
        "admin_only": "Faqat admin uchun!",
        "link_usage": "/link <zxmax_username>\nMisol: /link aziko",
        "link_not_found": "❌ '{name}' zxmax da topilmadi!",
        "link_claimed": "❌ Bu akkaunt allaqachon boshqa Telegram foydalanuvchisiga bog'langan!",
        "link_done": "✅ {name} ga bog'landingiz!",
        "need_link": "Avval /link <username> bilan bog'lanishingiz kerak!",
        "zx_user_gone": "zxmax foydalanuvchisi topilmadi. Qayta /link qiling.",
        "zx_bal": "🌐 {name}: {coins} ◎ (zxmax)",
        "num_required": "Miqdor son bo'lishi kerak!",
        "num_positive": "Miqdor 0 dan katta bo'lishi kerak!",
        "zx_short": "zxmax da yetarli tanga yo'q! ({coins} ◎)",
        "got_from_zx": "✅ {amount} ◎ zxmax dan bot ga ko'chirildi!",
        "bot_short": "Bot da yetarli tanga yo'q! ({coins} ◎)",
        "sent_to_zx": "✅ {amount} ◎ bot dan zxmax ga ko'chirildi!",
        "reg_done": "Rahmat, {name}! ✅",
        "user_not_found": "Foydalanuvchi topilmadi!",
        "addcoins_done": "✅ {name} ga +{amount} ◎. Yangi: {coins} ◎",
        "users_empty": "Foydalanuvchilar yo'q.",
        "top_title": "🏆 <b>TOP 10</b>\n\n",
        "top_entry": "{i}. {name} — {coins} ◎",
        "daily_done": "🎉 Kunlik bonus: +{amount} ◎! Jami: {total} ◎\nKeyingi bonus: 24 soatdan keyin.",
        "daily_wait": "Kunlik bonus allaqachon olindi. Keyingisi: {time}",
        "send_usage": "/send <id> <miqdor>\nMisol: /send 123456789 50",
        "send_self": "O'zingizga jo'nata olmaysiz!",
        "send_done": "✅ {amount} ◎ {name} ga jo'natildi!",
        "send_received": "📥 Sizga {name} dan {amount} ◎ keldi! Jami: {total} ◎",
        "ref_usage": "Do'stlaringizni taklif qiling va bonus oling!\n\n🔗 Taklif havolangiz:\n<code>{link}</code>\n\nHar bir taklif uchun sizga +{bonus} ◎, do'stingizga +{ref_bonus} ◎ beriladi.",
        "ref_new_user": "🎉 {name} sizning taklif havolangiz orqali ro'yxatdan o'tdi! Sizga +{bonus} ◎ berildi.",
        "ref_bonus_got": "🎉 Taklif bonusi: +{amount} ◎!",
        "history_title": "📜 <b>Tranzaksiyalar</b> (oxirgi 20 ta)\n\n",
        "history_empty": "Tranzaksiyalar yo'q.",
        "history_entry": "• {time} — {desc}: {amount} ◎",
        "broadcast_usage": "/broadcast <matn>\nMatnni yozing.",
        "broadcast_done": "✅ Xabar {count} foydalanuvchiga yuborildi.\nMuvaffaqiyatli: {ok}, xatolik: {fail}",
        "lang_changed": "✅ Til o'zgartirildi: O'zbekcha",
        "lang_uz": "🇺🇿 O'zbekcha",
        "lang_ru": "🇷🇺 Русский",
        "lang_kz": "🇰🇿 Қазақша",
        "lang_en": "🇬🇧 English",
        "lang_usage": "Tilni tanlang: /lang uz | /lang ru | /lang kz | /lang en",
        "games_title": "🎮 <b>O'yinlar</b>\n\n",
        "games_entry": "• <a href=\"{url}\">{name}</a> — {desc}",
        "games_web": "🌐 zxmax web",
        "stats_title": "📊 <b>Statistika</b>\n\n",
        "stats_users": "👤 Foydalanuvchilar: {total}",
        "stats_active": "📅 Bugun faol: {active}",
        "stats_coins": "💰 Jami tangalar: {coins} ◎",
        "stats_top": "🏆 Eng boy: {name} ({coins} ◎)",
        "banned": "🚫 Siz bloklangansiz!",
        "ban_usage": "/ban <id>\nMisol: /ban 123456789",
        "ban_done": "✅ {name} bloklandi!",
        "unban_usage": "/unban <id>",
        "unban_done": "✅ {name} blokdan chiqarildi!",
        "tasks_title": "📋 <b>Kunlik topshiriqlar</b>\n\n",
        "tasks_daily": "✅ /daily bonus oling — {done}/1",
        "tasks_coin": "✅ /coin tanga yig'ing — {done}/5",
        "tasks_play": "✅ O'yin o'ynang — {done}/1",
        "tasks_reward": "\n🎁 Barchasini bajaring: +{reward} ◎!",
        "tasks_done_all": "🎉 Barcha topshiriqlar bajarildi! +{reward} ◎ olindingiz!",
        "tasks_already": "Bugungi topshiriqlar allaqachon bajarilgan.",
        "poll_usage": "/poll <savol> | variant1 | variant2 | ...\nMisol: /poll Eng yaxshi o'yin? | Flappy | Snake | 2048",
        "poll_sent": "✅ So'rovnoma {count} foydalanuvchiga yuborildi!",
        "poll_title": "📊 <b>So'rovnoma</b>\n\n{savol}",
        "help": (
            "📋 <b>Buyruqlar</b>\n\n"
            "👤 <b>Asosiy</b>\n"
            "/start — Ro'yxatdan o'tish\n"
            "/bal — Bot balansi\n"
            "/coin — Tanga yig'ish (5 daqiqada 1-10◎)\n"
            "/profile — Profil\n"
            "/daily — Kunlik bonus\n"
            "/top — Reyting (matn)\n"
            "/topimg — Reyting (rasm)\n"
            "/history — Tranzaksiyalar tarixi\n"
            "/referral — Do'st taklif qilish\n"
            "/send &lt;id&gt; &lt;miqdor&gt; — Tanga jo'natish\n"
            "/transfer @user &lt;miqdor&gt; — Foydalanuvchiga tanga jo'natish\n"
            "/gift @user &lt;miqdor&gt; — Sovg'a qilish\n"
            "/games — O'yinlar ro'yxati\n"
            "/tasks — Kunlik topshiriqlar\n"
            "/level — Daraja va XP\n"
            "/bank — Bankga pul qo'yish\n"
            "/shop — Do'kon\n"
            "/buy &lt;id&gt; — Do'kondan xarid qilish\n"
            "/inventory — Yutilgan lotlar\n"
            "/claim — Saytdan tanga olish\n"
            "/credit — Bankdan qarz olish\n"
            "/repay — Qarzni qaytarish\n"
            "/lang uz|ru|kz|en — Til tanlash\n\n"
            "🌐 <b>zxmax</b>\n"
            "/link &lt;username&gt; — zxmax ga bog'lash\n"
            "/zxbal — zxmax balansi\n"
            "/zxget &lt;miqdor&gt; — zxmax dan olish\n"
            "/zxsend &lt;miqdor&gt; — zxmax ga jo'natish"
        ),
    },
    "ru": {
        "start_back": "С возвращением, {name}! 👋\n💰 Баланс бота: {coins} ◎",
        "start_reg": "Напишите ваше имя:",
        "bot_info": "🤖 <b>ZXMAX Bot</b>\n\nС помощью этого бота вы можете собирать монеты, играть в игры и связываться с платформой zxmax!\n\nИспользуйте кнопки ниже для перехода в канал и чат:",
        "btn_channel": "📢 Канал",
        "btn_chat": "💬 Чат",
        "need_start": "Сначала нажмите /start!",
        "balance": "💰 {name}: {coins} ◎",
        "coin_wait": "Подождите {left} секунд ⏳",
        "coin_got": "🎉 +{amount} ◎! Всего: {total} ◎",
        "profile": "👤 <b>Профиль</b>\n\nИмя: {name}\nUsername: {username}\nID: <code>{id}</code>\n💰 Баланс бота: {coins} ◎",
        "admin_only": "Только для админа!",
        "link_usage": "/link <zxmax_username>\nПример: /link aziko",
        "link_not_found": "❌ '{name}' не найден в zxmax!",
        "link_claimed": "❌ Этот аккаунт уже привязан к другому пользователю Telegram!",
        "link_done": "✅ Привязан к {name}!",
        "need_link": "Сначала привяжите /link <username>!",
        "zx_user_gone": "Пользователь zxmax не найден. Сделайте /link заново.",
        "zx_bal": "🌐 {name}: {coins} ◎ (zxmax)",
        "num_required": "Сумма должна быть числом!",
        "num_positive": "Сумма должна быть больше 0!",
        "zx_short": "В zxmax недостаточно монет! ({coins} ◎)",
        "got_from_zx": "✅ {amount} ◎ переведено из zxmax в бота!",
        "bot_short": "В боте недостаточно монет! ({coins} ◎)",
        "sent_to_zx": "✅ {amount} ◎ переведено из бота в zxmax!",
        "reg_done": "Спасибо, {name}! ✅",
        "user_not_found": "Пользователь не найден!",
        "addcoins_done": "✅ {name} получил +{amount} ◎. Баланс: {coins} ◎",
        "users_empty": "Нет пользователей.",
        "top_title": "🏆 <b>ТОП 10</b>\n\n",
        "top_entry": "{i}. {name} — {coins} ◎",
        "daily_done": "🎉 Ежедневный бонус: +{amount} ◎! Всего: {total} ◎\nСледующий бонус: через 24 часа.",
        "daily_wait": "Бонус уже получен. Следующий: {time}",
        "send_usage": "/send <id> <сумма>\nПример: /send 123456789 50",
        "send_self": "Нельзя отправить самому себе!",
        "send_done": "✅ {amount} ◎ отправлено {name}!",
        "send_received": "📥 Вы получили {amount} ◎ от {name}! Всего: {total} ◎",
        "ref_usage": "Приглашайте друзей и получайте бонусы!\n\n🔗 Ваша ссылка:\n<code>{link}</code>\n\nЗа каждое приглашение вы получаете +{bonus} ◎, ваш друг +{ref_bonus} ◎.",
        "ref_new_user": "🎉 {name} зарегистрировался по вашей ссылке! Вы получили +{bonus} ◎.",
        "ref_bonus_got": "🎉 Бонус за приглашение: +{amount} ◎!",
        "history_title": "📜 <b>Транзакции</b> (последние 20)\n\n",
        "history_empty": "Нет транзакций.",
        "history_entry": "• {time} — {desc}: {amount} ◎",
        "broadcast_usage": "/broadcast <текст>\nНапишите текст.",
        "broadcast_done": "✅ Сообщение отправлено {count} пользователям.\nУспешно: {ok}, ошибок: {fail}",
        "lang_changed": "✅ Язык изменён: Русский",
        "lang_uz": "🇺🇿 O'zbekcha",
        "lang_ru": "🇷🇺 Русский",
        "lang_kz": "🇰🇿 Қазақша",
        "lang_en": "🇬🇧 English",
        "lang_usage": "Выберите язык: /lang uz | /lang ru | /lang kz | /lang en",
        "games_title": "🎮 <b>Игры</b>\n\n",
        "games_entry": "• <a href=\"{url}\">{name}</a> — {desc}",
        "games_web": "🌐 zxmax web",
        "stats_title": "📊 <b>Статистика</b>\n\n",
        "stats_users": "👤 Пользователей: {total}",
        "stats_active": "📅 Активных сегодня: {active}",
        "stats_coins": "💰 Всего монет: {coins} ◎",
        "stats_top": "🏆 Самый богатый: {name} ({coins} ◎)",
        "banned": "🚫 Вы заблокированы!",
        "ban_usage": "/ban <id>\nПример: /ban 123456789",
        "ban_done": "✅ {name} заблокирован!",
        "unban_usage": "/unban <id>",
        "unban_done": "✅ {name} разблокирован!",
        "tasks_title": "📋 <b>Ежедневные задания</b>\n\n",
        "tasks_daily": "✅ Получить /daily бонус — {done}/1",
        "tasks_coin": "✅ Собрать /coin монеты — {done}/5",
        "tasks_play": "✅ Сыграть в игру — {done}/1",
        "tasks_reward": "\n🎁 Выполните все: +{reward} ◎!",
        "tasks_done_all": "🎉 Все задания выполнены! +{reward} ◎ получено!",
        "tasks_already": "Сегодняшние задания уже выполнены.",
        "poll_usage": "/poll <вопрос> | вариант1 | вариант2 | ...\nПример: /poll Лучшая игра? | Flappy | Snake | 2048",
        "poll_sent": "✅ Опрос отправлен {count} пользователям!",
        "poll_title": "📊 <b>Опрос</b>\n\n{вопрос}",
        "help": (
            "📋 <b>Команды</b>\n\n"
            "👤 <b>Основные</b>\n"
            "/start — Регистрация\n"
            "/bal — Баланс бота\n"
            "/coin — Сбор монет (5 мин, 1-10◎)\n"
            "/profile — Профиль\n"
            "/daily — Ежедневный бонус\n"
            "/top — Рейтинг (текст)\n"
            "/topimg — Рейтинг (картинка)\n"
            "/history — История транзакций\n"
            "/referral — Пригласить друга\n"
            "/send &lt;id&gt; &lt;сумма&gt; — Отправить монеты по ID\n"
            "/transfer @user &lt;сумма&gt; — Отправить монеты пользователю\n"
            "/gift @user &lt;сумма&gt; — Подарить монеты\n"
            "/games — Список игр\n"
            "/tasks — Ежедневные задания\n"
            "/level — Уровень и XP\n"
            "/bank — Положить деньги в банк\n"
            "/shop — Магазин\n"
            "/buy &lt;id&gt; — Купить из магазина\n"
            "/inventory — Выигранные лоты\n"
            "/claim — Забрать монеты с сайта\n"
            "/credit — Взять кредит в банке\n"
            "/repay — Погасить кредит\n"
            "/lang uz|ru|kz|en — Язык\n\n"
            "🌐 <b>zxmax</b>\n"
            "/link &lt;username&gt; — Привязать zxmax\n"
            "/zxbal — Баланс zxmax\n"
            "/zxget &lt;сумма&gt; — Из zxmax в бота\n"
            "/zxsend &lt;сумма&gt; — Из бота в zxmax"
        ),
    },
    "kz": {
        "start_back": "Қайта оралдыңыз, {name}! 👋\n💰 Бот балансы: {coins} ◎",
        "start_reg": "Атыңызды жазыңыз:",
        "bot_info": "🤖 <b>ZXMAX Bot</b>\n\nБұл бот арқылы сіз монета жинай аласыз, ойындар ойнай аласыз және zxmax платформасына қосыла аласыз!\n\nТөмендегі түймелер арқылы канал мен чатқа өтіңіз:",
        "btn_channel": "📢 Канал",
        "btn_chat": "💬 Чат",
        "need_start": "Алдымен /start басыңыз!",
        "balance": "💰 {name}: {coins} ◎",
        "coin_wait": "{left} секунд күтіңіз ⏳",
        "coin_got": "🎉 +{amount} ◎! Барлығы: {total} ◎",
        "profile": "👤 <b>Профиль</b>\n\nАты: {name}\nUsername: {username}\nID: <code>{id}</code>\n💰 Бот балансы: {coins} ◎",
        "admin_only": "Тек админ үшін!",
        "link_usage": "/link <zxmax_username>\nМысалы: /link aziko",
        "link_not_found": "❌ '{name}' zxmax-та табылмады!",
        "link_claimed": "❌ Бұл аккаунт басқа Telegram пайдаланушысына тіркелген!",
        "link_done": "✅ {name} -ге тіркелді!",
        "need_link": "Алдымен /link <username> басыңыз!",
        "zx_user_gone": "zxmax пайдаланушысы табылмады. /link қайталаңыз.",
        "zx_bal": "🌐 {name}: {coins} ◎ (zxmax)",
        "num_required": "Сома сан болуы керек!",
        "num_positive": "Сома 0-ден үлкен болуы керек!",
        "zx_short": "zxmax-та монета жеткіліксіз! ({coins} ◎)",
        "got_from_zx": "✅ {amount} ◎ zxmax-тан ботқа аударылды!",
        "bot_short": "Ботта монета жеткіліксіз! ({coins} ◎)",
        "sent_to_zx": "✅ {amount} ◎ боттан zxmax-қа аударылды!",
        "reg_done": "Рахмет, {name}! ✅",
        "user_not_found": "Пайдаланушы табылмады!",
        "addcoins_done": "✅ {name} +{amount} ◎ алды. Жаңа: {coins} ◎",
        "users_empty": "Пайдаланушылар жоқ.",
        "top_title": "🏆 <b>ҮЗДІК 10</b>\n\n",
        "top_entry": "{i}. {name} — {coins} ◎",
        "daily_done": "🎉 Күнделікті бонус: +{amount} ◎! Барлығы: {total} ◎\nКелесі бонус: 24 сағаттан кейін.",
        "daily_wait": "Күнделікті бонус алынды. Келесі: {time}",
        "send_usage": "/send <id> <сома>\nМысалы: /send 123456789 50",
        "send_self": "Өзіңізге жібере алмайсыз!",
        "send_done": "✅ {amount} ◎ {name} -ге жіберілді!",
        "send_received": "📥 Сіз {name} -ден {amount} ◎ алдыңыз! Барлығы: {total} ◎",
        "ref_usage": "Достарыңызды шақырып бонустар алыңыз!\n\n🔗 Сілтемеңіз:\n<code>{link}</code>\n\nСіз +{bonus} ◎ аласыз, досыңыз +{ref_bonus} ◎ алады.",
        "ref_new_user": "🎉 {name} сілтемеңіз арқылы тіркелді! Сіз +{bonus} ◎ алдыңыз.",
        "ref_bonus_got": "🎉 Реферал бонусы: +{amount} ◎!",
        "history_title": "📜 <b>Транзакциялар</b> (соңғы 20)\n\n",
        "history_empty": "Транзакциялар жоқ.",
        "history_entry": "• {time} — {desc}: {amount} ◎",
        "broadcast_usage": "/broadcast <мәтін>\nМәтінді жазыңыз.",
        "broadcast_done": "✅ Хабарлама {count} пайдаланушыға жіберілді.\nСәтті: {ok}, қате: {fail}",
        "lang_changed": "✅ Тіл өзгертілді: Қазақша",
        "lang_uz": "🇺🇿 O'zbekcha",
        "lang_ru": "🇷🇺 Русский",
        "lang_kz": "🇰🇿 Қазақша",
        "lang_en": "🇬🇧 English",
        "lang_usage": "Тілді таңдаңыз: /lang uz | /lang ru | /lang kz | /lang en",
        "games_title": "🎮 <b>Ойындар</b>\n\n",
        "games_entry": "• <a href=\"{url}\">{name}</a> — {desc}",
        "games_web": "🌐 zxmax web",
        "stats_title": "📊 <b>Статистика</b>\n\n",
        "stats_users": "👤 Пайдаланушылар: {total}",
        "stats_active": "📅 Бүгін белсенді: {active}",
        "stats_coins": "💰 Барлық монеталар: {coins} ◎",
        "stats_top": "🏆 Ең бай: {name} ({coins} ◎)",
        "banned": "🚫 Сіз блокталдыңыз!",
        "ban_usage": "/ban <id>\nМысалы: /ban 123456789",
        "ban_done": "✅ {name} блокталды!",
        "unban_usage": "/unban <id>",
        "unban_done": "✅ {name} блоктан шығарылды!",
        "tasks_title": "📋 <b>Күнделікті тапсырмалар</b>\n\n",
        "tasks_daily": "✅ /daily бонус алу — {done}/1",
        "tasks_coin": "✅ /coin монета жинау — {done}/5",
        "tasks_play": "✅ Ойын ойнау — {done}/1",
        "tasks_reward": "\n🎁 Барлығын орындаңыз: +{reward} ◎!",
        "tasks_done_all": "🎉 Барлық тапсырмалар орындалды! +{reward} ◎ алдыңыз!",
        "tasks_already": "Бүгінгі тапсырмалар орындалған.",
        "poll_usage": "/poll <сұрақ> | нұсқа1 | нұсқа2 | ...\nМысалы: /poll Ең жақсы ойын? | Flappy | Snake | 2048",
        "poll_sent": "✅ Сауалнама {count} пайдаланушыға жіберілді!",
        "poll_title": "📊 <b>Сауалнама</b>\n\n{savol}",
        "help": (
            "📋 <b>Бұйрықтар</b>\n\n"
            "👤 <b>Негізгі</b>\n"
            "/start — Тіркелу\n"
            "/bal — Бот балансы\n"
            "/coin — Монета жинау (5 мин, 1-10◎)\n"
            "/profile — Профиль\n"
            "/daily — Күнделікті бонус\n"
            "/top — Рейтинг (мәтін)\n"
            "/topimg — Рейтинг (сурет)\n"
            "/history — Транзакциялар тарихы\n"
            "/referral — Дос шақыру\n"
            "/send &lt;id&gt; &lt;сома&gt; — Монета жіберу (ID)\n"
            "/transfer @user &lt;сома&gt; — Пайдаланушыға монета жіберу\n"
            "/gift @user &lt;сома&gt; — Сыйлық беру\n"
            "/games — Ойындар тізімі\n"
            "/tasks — Күнделікті тапсырмалар\n"
            "/level — Деңгей және XP\n"
            "/bank — Банкке ақша салу\n"
            "/shop — Дүкен\n"
            "/buy &lt;id&gt; — Дүкеннен сатып алу\n"
            "/inventory — Ұтылған лоттар\n"
            "/claim — Сайттан монета алу\n"
            "/credit — Банктен қарыз алу\n"
            "/repay — Қарызды қайтару\n"
            "/lang uz|ru|kz|en — Тіл таңдау\n\n"
            "🌐 <b>zxmax</b>\n"
            "/link &lt;username&gt; — zxmax-қа тіркеу\n"
            "/zxbal — zxmax балансы\n"
            "/zxget &lt;сома&gt; — zxmax-тан алу\n"
            "/zxsend &lt;сома&gt; — zxmax-қа жіберу"
        ),
    },
    "en": {
        "start_back": "Welcome back, {name}! 👋\n💰 Bot balance: {coins} ◎",
        "start_reg": "Write your name:",
        "bot_info": "🤖 <b>ZXMAX Bot</b>\n\nWith this bot you can collect coins, play games and connect to zxmax platform!\n\nUse the buttons below to go to channel and chat:",
        "btn_channel": "📢 Channel",
        "btn_chat": "💬 Chat",
        "need_start": "Press /start first!",
        "balance": "💰 {name}: {coins} ◎",
        "coin_wait": "Wait {left} seconds ⏳",
        "coin_got": "🎉 +{amount} ◎! Total: {total} ◎",
        "profile": "👤 <b>Profile</b>\n\nName: {name}\nUsername: {username}\nID: <code>{id}</code>\n💰 Bot balance: {coins} ◎",
        "admin_only": "Admin only!",
        "link_usage": "/link <zxmax_username>\nExample: /link aziko",
        "link_not_found": "❌ '{name}' not found on zxmax!",
        "link_claimed": "❌ This account is already linked to another Telegram user!",
        "link_done": "✅ Linked to {name}!",
        "need_link": "First use /link <username>!",
        "zx_user_gone": "zxmax user not found. Use /link again.",
        "zx_bal": "🌐 {name}: {coins} ◎ (zxmax)",
        "num_required": "Amount must be a number!",
        "num_positive": "Amount must be greater than 0!",
        "zx_short": "Not enough coins on zxmax! ({coins} ◎)",
        "got_from_zx": "✅ {amount} ◎ transferred from zxmax to bot!",
        "bot_short": "Not enough coins in bot! ({coins} ◎)",
        "sent_to_zx": "✅ {amount} ◎ transferred from bot to zxmax!",
        "reg_done": "Thank you, {name}! ✅",
        "user_not_found": "User not found!",
        "addcoins_done": "✅ {name} got +{amount} ◎. New: {coins} ◎",
        "users_empty": "No users.",
        "top_title": "🏆 <b>TOP 10</b>\n\n",
        "top_entry": "{i}. {name} — {coins} ◎",
        "daily_done": "🎉 Daily bonus: +{amount} ◎! Total: {total} ◎\nNext bonus: in 24 hours.",
        "daily_wait": "Daily bonus already claimed. Next: {time}",
        "send_usage": "/send <id> <amount>\nExample: /send 123456789 50",
        "send_self": "You can't send to yourself!",
        "send_done": "✅ {amount} ◎ sent to {name}!",
        "send_received": "📥 You received {amount} ◎ from {name}! Total: {total} ◎",
        "ref_usage": "Invite friends and get bonuses!\n\n🔗 Your referral link:\n<code>{link}</code>\n\nYou get +{bonus} ◎, your friend gets +{ref_bonus} ◎.",
        "ref_new_user": "🎉 {name} registered using your referral link! You got +{bonus} ◎.",
        "ref_bonus_got": "🎉 Referral bonus: +{amount} ◎!",
        "history_title": "📜 <b>Transactions</b> (last 20)\n\n",
        "history_empty": "No transactions.",
        "history_entry": "• {time} — {desc}: {amount} ◎",
        "broadcast_usage": "/broadcast <text>\nWrite the text.",
        "broadcast_done": "✅ Message sent to {count} users.\nSuccess: {ok}, errors: {fail}",
        "lang_changed": "✅ Language changed: English",
        "lang_uz": "🇺🇿 O'zbekcha",
        "lang_ru": "🇷🇺 Русский",
        "lang_kz": "🇰🇿 Қазақша",
        "lang_en": "🇬🇧 English",
        "lang_usage": "Choose language: /lang uz | /lang ru | /lang kz | /lang en",
        "games_title": "🎮 <b>Games</b>\n\n",
        "games_entry": "• <a href=\"{url}\">{name}</a> — {desc}",
        "games_web": "🌐 zxmax web",
        "stats_title": "📊 <b>Statistics</b>\n\n",
        "stats_users": "👤 Users: {total}",
        "stats_active": "📅 Active today: {active}",
        "stats_coins": "💰 Total coins: {coins} ◎",
        "stats_top": "🏆 Richest: {name} ({coins} ◎)",
        "banned": "🚫 You are banned!",
        "ban_usage": "/ban <id>\nExample: /ban 123456789",
        "ban_done": "✅ {name} banned!",
        "unban_usage": "/unban <id>",
        "unban_done": "✅ {name} unbanned!",
        "tasks_title": "📋 <b>Daily Tasks</b>\n\n",
        "tasks_daily": "✅ Claim /daily bonus — {done}/1",
        "tasks_coin": "✅ Collect /coin — {done}/5",
        "tasks_play": "✅ Play a game — {done}/1",
        "tasks_reward": "\n🎁 Complete all: +{reward} ◎!",
        "tasks_done_all": "🎉 All tasks completed! +{reward} ◎ earned!",
        "tasks_already": "Today's tasks already completed.",
        "poll_usage": "/poll <question> | option1 | option2 | ...\nExample: /poll Best game? | Flappy | Snake | 2048",
        "poll_sent": "✅ Poll sent to {count} users!",
        "poll_title": "📊 <b>Poll</b>\n\n{savol}",
        "help": (
            "📋 <b>Commands</b>\n\n"
            "👤 <b>Basic</b>\n"
            "/start — Register\n"
            "/bal — Bot balance\n"
            "/coin — Collect coins (5 min, 1-10◎)\n"
            "/profile — Profile\n"
            "/daily — Daily bonus\n"
            "/top — Ranking (text)\n"
            "/topimg — Ranking (image)\n"
            "/history — Transaction history\n"
            "/referral — Invite a friend\n"
            "/send &lt;id&gt; &lt;amount&gt; — Send coins by ID\n"
            "/transfer @user &lt;amount&gt; — Send coins to user\n"
            "/gift @user &lt;amount&gt; — Gift coins\n"
            "/games — Games list\n"
            "/tasks — Daily tasks\n"
            "/level — Level and XP\n"
            "/bank — Deposit coins to bank\n"
            "/shop — Shop\n"
            "/buy &lt;id&gt; — Buy from shop\n"
            "/inventory — Won auction lots\n"
            "/claim — Claim coins from website\n"
            "/credit — Borrow credit from bank\n"
            "/repay — Repay credit\n"
            "/lang uz|ru|kz|en — Language\n\n"
            "🌐 <b>zxmax</b>\n"
            "/link &lt;username&gt; — Link zxmax account\n"
            "/zxbal — zxmax balance\n"
            "/zxget &lt;amount&gt; — From zxmax to bot\n"
            "/zxsend &lt;amount&gt; — From bot to zxmax"
        ),
    },
}

REFERRAL_BONUS = 10
REFERRAL_REF_BONUS = 5

LEVEL_XP_PER_TX = 10
LEVEL_BASE_XP = 100
LEVEL_XP_MULT = 50

def get_level(xp):
    level = 0
    needed = LEVEL_BASE_XP
    while xp >= needed:
        xp -= needed
        level += 1
        needed = LEVEL_BASE_XP + level * LEVEL_XP_MULT
    return level, xp, needed

def add_xp(user, amount=LEVEL_XP_PER_TX):
    current_xp = user.get("xp", 0)
    old_level = get_level(current_xp)[0]
    current_xp += amount
    user["xp"] = current_xp
    new_level = get_level(current_xp)[0]
    bonus = 0
    if new_level > old_level:
        bonus = new_level * 50
        user["coins"] = user.get("coins", 0) + bonus
    return new_level > old_level, bonus

def load_banned():
    if not os.path.exists(BANNED_FILE):
        return []
    with open(BANNED_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_banned(banned):
    with open(BANNED_FILE, "w", encoding="utf-8") as f:
        json.dump(banned, f, indent=2)

def is_banned(user_id):
    return user_id in load_banned()

def load_auctions():
    if not os.path.exists(AUCTION_FILE):
        return {}
    with open(AUCTION_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_auctions(auctions):
    with open(AUCTION_FILE, "w", encoding="utf-8") as f:
        json.dump(auctions, f, indent=2, ensure_ascii=False)

def load_bank():
    if not os.path.exists(BANK_FILE):
        return {"total": 100, "users": {}}
    with open(BANK_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_bank(bank):
    with open(BANK_FILE, "w", encoding="utf-8") as f:
        json.dump(bank, f, indent=2, ensure_ascii=False)

def get_user_total_money(uid):
    users = load_users()
    u = get_user(users, uid)
    balance = u.get("coins", 0) if u else 0
    bank = load_bank()
    deposit = bank["users"].get(str(uid), {}).get("amount", 0)
    return balance + deposit, balance, deposit

WEEK_SECONDS = 7 * 24 * 3600

def calc_bank_total(amount, deposited_at):
    elapsed = time.time() - deposited_at
    weeks = int(elapsed / WEEK_SECONDS)
    total = amount
    for _ in range(weeks):
        total = int(total * 1.1)
    return total

def load_users():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_users(users):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2, ensure_ascii=False)

def get_user(users, user_id):
    for u in users:
        if u["id"] == user_id:
            return u
    return None

def _(user, key, **kwargs):
    lang = user.get("lang", "ru") if user else "ru"
    text = LANG.get(lang, LANG["ru"]).get(key, key)
    if kwargs:
        text = text.format(**kwargs)
    return text

async def check_banned(update: Update):
    if is_banned(update.effective_user.id):
        await update.message.reply_text("🚫 Siz bloklangansiz!")
        return True
    return False

def _a(user, key, **kwargs):
    """Admin language helper - always uses admin's language."""
    return _(user or {"lang": "ru"}, key, **kwargs)

def log_tx(user, tx_type, amount, desc):
    if "history" not in user:
        user["history"] = []
    user["history"].append({
        "type": tx_type,
        "amount": amount,
        "desc": desc,
        "time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
    })
    if len(user["history"]) > 20:
        user["history"] = user["history"][-20:]
    if tx_type != "reg":
        leveled_up, bonus = add_xp(user)
        if leveled_up:
            lvl = get_level(user["xp"])[0]
            user["history"].append({
                "type": "level_up",
                "amount": bonus,
                "desc": f"Level {lvl} ga yetdingiz! +{bonus}◎",
                "time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
            })
            if len(user["history"]) > 20:
                user["history"] = user["history"][-20:]

def web_btn():
    return InlineKeyboardMarkup([[InlineKeyboardButton("zxmax web", web_app=WebAppInfo(url=WEB_URL))]])

def start_btn(lang="ru"):
    l = LANG.get(lang, LANG["ru"])
    kb = [
        [InlineKeyboardButton(l["btn_channel"], url=CHANNEL_URL),
         InlineKeyboardButton(l["btn_chat"], url=CHAT_URL)],
        [InlineKeyboardButton("🌐 zxmax web", web_app=WebAppInfo(url=WEB_URL)),
         InlineKeyboardButton("📖 Help /help", callback_data="help")],
    ]
    return InlineKeyboardMarkup(kb)

def menu_keyboard():
    kb = [
        [KeyboardButton("🆘 Help"), KeyboardButton("💰 Balans")],
        [KeyboardButton("🏦 Bank"), KeyboardButton("🎮 O'yinlar")],
        [KeyboardButton("🏆 Top"), KeyboardButton("👤 Profil")],
        [KeyboardButton("🌐 Saytga o'tish")],
    ]
    return ReplyKeyboardMarkup(kb, resize_keyboard=True)

def get_lang_keyboard():
    kb = [
        [InlineKeyboardButton(LANG["uz"]["lang_uz"], callback_data="lang_uz"),
         InlineKeyboardButton(LANG["ru"]["lang_ru"], callback_data="lang_ru")],
        [InlineKeyboardButton(LANG["kz"]["lang_kz"], callback_data="lang_kz"),
         InlineKeyboardButton(LANG["en"]["lang_en"], callback_data="lang_en")],
    ]
    return InlineKeyboardMarkup(kb)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    users = load_users()
    existing = get_user(users, user.id)
    ulang = existing.get("lang", "ru") if existing else "ru"
    # Bot info + buttons for everyone
    await update.message.reply_text(
        _(existing if existing else {"lang": "ru"}, "bot_info"),
        reply_markup=start_btn(ulang),
        parse_mode="HTML",
    )
    if existing and existing.get("name"):
        coins = existing.get("coins", 0)
        await update.message.reply_text(
            _(existing, "start_back", name=existing["name"], coins=coins),
            reply_markup=menu_keyboard(),
        )
        return
    # Check for referral
    if context.args:
        ref_arg = context.args[0]
        if ref_arg.startswith("ref_"):
            try:
                referrer_id = int(ref_arg[4:])
                if referrer_id != user.id:
                    context.user_data["referred_by"] = referrer_id
            except:
                pass
    context.user_data["awaiting_name"] = True
    await update.message.reply_text(_({"lang": "ru"}, "start_reg"))

async def balance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if await check_banned(update): return
    users = load_users()
    u = get_user(users, user.id)
    if not u:
        await update.message.reply_text(_(u, "need_start"))
        return
    apply_credit_interest(u, users)
    save_users(users)
    await update.message.reply_text(_(u, "balance", name=u.get("name"), coins=u.get("coins", 0)), reply_markup=web_btn())

async def coin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if await check_banned(update): return
    users = load_users()
    u = get_user(users, user.id)
    if not u:
        await update.message.reply_text(_(u, "need_start"))
        return
    now = time.time()
    last = u.get("last_coin", 0)
    if now - last < 300:
        left = int(300 - (now - last))
        await update.message.reply_text(_(u, "coin_wait", left=left), reply_markup=web_btn())
        return
    amount = random.randint(1, 10)
    u["coins"] = u.get("coins", 0) + amount
    u["last_coin"] = now
    log_tx(u, "coin", amount, "/coin")
    # Track for tasks
    day_key = datetime.datetime.now().strftime("%Y-%m-%d")
    t = u.get("tasks", {})
    if t.get("day") == day_key:
        t["coin_count"] = t.get("coin_count", 0) + 1
        u["tasks"] = t
    save_users(users)
    await update.message.reply_text(_(u, "coin_got", amount=amount, total=u["coins"]), reply_markup=web_btn())

async def profile(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if await check_banned(update): return
    users = load_users()
    u = get_user(users, user.id)
    if not u:
        await update.message.reply_text(_(u, "need_start"))
        return
    username = f"@{user.username}" if user.username else "yo'q"
    xp = u.get("xp", 0)
    lvl, xp_progress, xp_needed = get_level(xp)
    await update.message.reply_text(
        _(u, "profile", name=u.get("name"), username=username, id=user.id, coins=u.get("coins", 0))
        + f"\n⭐ Level {lvl} | XP: {xp_progress}/{xp_needed}",
        parse_mode="HTML",
        reply_markup=web_btn(),
    )

async def addcoins(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    args = context.args
    if len(args) < 2:
        await update.message.reply_text("/addcoins <id> <miqdor>")
        return
    try:
        target_id = int(args[0])
        amount = int(args[1])
    except:
        await update.message.reply_text("ID va miqdor son bo'lishi kerak!")
        return
    users = load_users()
    u = get_user(users, target_id)
    if not u:
        await update.message.reply_text(_(u, "user_not_found"))
        return
    u["coins"] = u.get("coins", 0) + amount
    log_tx(u, "admin_add", amount, f"/addcoins (admin)")
    save_users(users)
    await update.message.reply_text(_({"lang": "ru"}, "addcoins_done", name=u["name"], amount=amount, coins=u["coins"]))

async def help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    users = load_users()
    u = get_user(users, update.effective_user.id)
    is_admin = update.effective_user.id == ADMIN_ID
    text = _(u, "help")
    if is_admin:
        text += (
            "\n\n⚙️ <b>Admin</b>\n"
            "/users — Barcha foydalanuvchilar\n"
            "/stats — Statistika\n"
            "/addcoins &lt;id&gt; &lt;miqdor&gt; — Tanga qo'shish\n"
            "/givecoins @user &lt;miqdor&gt; — Userga tanga berish\n"
            "/removecoins @user &lt;miqdor&gt; — Userdan tanga olish\n"
            "/giftall &lt;miqdor&gt; — Hammaga tanga berish\n"
            "/resetcoins @user — Tangani nollash\n"
            "/setbank &lt;miqdor&gt; — Bank totalni o'zgartirish\n"
            "/broadcast &lt;matn&gt; — Xabar yuborish\n"
            "/ban &lt;id&gt; — Bloklash\n"
            "/unban &lt;id&gt; — Blokdan chiqarish\n"
            "/poll &lt;matn&gt; — So'rovnoma yuborish\n"
            "/addshop &lt;id, nom, narx, izoh&gt; — Do'konga mahsulot qo'shish\n"
            "/zxauct &lt;ID, nom, rarity&gt; — Lot yaratish (reply rasm/video)\n"
            "/auction &lt;ID, nom, rarity, narx&gt; — Auktsion boshlash\n"
            "/setrarity &lt;ID&gt; &lt;rarity&gt; — Lot rarity o'zgartirish\n"
            "/setname &lt;ID&gt; &lt;nom&gt; — Lot nomini o'zgartirish"
        )
    await update.message.reply_text(text, parse_mode="HTML", reply_markup=web_btn())

async def help_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    users = load_users()
    u = get_user(users, query.from_user.id)
    is_admin = query.from_user.id == ADMIN_ID
    text = _(u, "help")
    if is_admin:
        text += (
            "\n\n⚙️ <b>Admin</b>\n"
            "/users — Barcha foydalanuvchilar\n"
            "/stats — Statistika\n"
            "/addcoins &lt;id&gt; &lt;miqdor&gt; — Tanga qo'shish\n"
            "/givecoins @user &lt;miqdor&gt; — Userga tanga berish\n"
            "/removecoins @user &lt;miqdor&gt; — Userdan tanga olish\n"
            "/giftall &lt;miqdor&gt; — Hammaga tanga berish\n"
            "/resetcoins @user — Tangani nollash\n"
            "/setbank &lt;miqdor&gt; — Bank totalni o'zgartirish\n"
            "/broadcast &lt;matn&gt; — Xabar yuborish\n"
            "/ban &lt;id&gt; — Bloklash\n"
            "/unban &lt;id&gt; — Blokdan chiqarish\n"
            "/poll &lt;matn&gt; — So'rovnoma yuborish\n"
            "/addshop &lt;id, nom, narx, izoh&gt; — Do'konga mahsulot qo'shish\n"
            "/zxauct &lt;ID, nom, rarity&gt; — Lot yaratish (reply rasm/video)\n"
            "/auction &lt;ID, nom, rarity, narx&gt; — Auktsion boshlash\n"
            "/setrarity &lt;ID&gt; &lt;rarity&gt; — Lot rarity o'zgartirish\n"
            "/setname &lt;ID&gt; &lt;nom&gt; — Lot nomini o'zgartirish"
        )
    await query.edit_message_text(text, parse_mode="HTML", reply_markup=web_btn())

async def users(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    all_users = load_users()
    if not all_users:
        await update.message.reply_text(_({"lang": "ru"}, "users_empty"))
        return
    lines = []
    for u in all_users:
        name = u.get("name", "?")
        uid = u.get("id", "?")
        coins = u.get("coins", 0)
        zx = u.get("zxmax_user", "-")
        lines.append(f"👤 <b>{name}</b>\nID: <code>{uid}</code>\n💰 {coins}◎\n🌐 {zx}")
    chunks = []
    current = ""
    for l in lines:
        if len(current) + len(l) > 3500:
            chunks.append(current)
            current = ""
        current += l + "\n\n"
    if current:
        chunks.append(current)
    for c in chunks:
        await update.message.reply_text(c.strip(), parse_mode="HTML")

async def link(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not FIREBASE_OK:
        await update.message.reply_text("Firebase ulanmagan!")
        return
    user = update.effective_user
    users = load_users()
    u = get_user(users, user.id)
    if not u:
        await update.message.reply_text(_(u, "need_start"))
        return
    args = context.args
    if not args:
        await update.message.reply_text(_(u, "link_usage"))
        return
    zx_username = args[0].lower()
    zx_user = get_user_by_username(zx_username)
    if not zx_user:
        await update.message.reply_text(_(u, "link_not_found", name=zx_username))
        return
    # Check if already claimed by another Telegram user
    existing_tg = zx_user.get("telegramId")
    if existing_tg and existing_tg != user.id:
        await update.message.reply_text(_(u, "link_claimed"))
        return
    # Claim / update telegramId
    if not existing_tg:
        set_telegram_id(zx_user["id"], user.id)
    u["zxmax_user"] = zx_username
    u["zxmax_uid"] = zx_user["id"]
    save_users(users)
    await update.message.reply_text(_(u, "link_done", name=zx_username), reply_markup=web_btn())

async def zxbal(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not FIREBASE_OK:
        await update.message.reply_text("Firebase ulanmagan!")
        return
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u or not u.get("zxmax_uid"):
        await update.message.reply_text(_(u, "need_link"))
        return
    zx_user = get_user_by_username(u["zxmax_user"])
    if not zx_user:
        await update.message.reply_text(_(u, "zx_user_gone"))
        return
    coins = zx_user.get("coins", 0)
    name = zx_user.get("name", u["zxmax_user"])
    await update.message.reply_text(_(u, "zx_bal", name=name, coins=coins), reply_markup=web_btn())

async def zxget(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not FIREBASE_OK:
        await update.message.reply_text("Firebase ulanmagan!")
        return
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u or not u.get("zxmax_uid"):
        await update.message.reply_text(_(u, "need_link"))
        return
    args = context.args
    if not args:
        await update.message.reply_text("/zxget <miqdor>\nMisol: /zxget 50")
        return
    try:
        amount = int(args[0])
    except:
        await update.message.reply_text(_(u, "num_required"))
        return
    if amount <= 0:
        await update.message.reply_text(_(u, "num_positive"))
        return
    zx_user = get_user_by_username(u["zxmax_user"])
    if not zx_user:
        await update.message.reply_text(_(u, "zx_user_gone"))
        return
    zx_coins = zx_user.get("coins", 0)
    if zx_coins < amount:
        await update.message.reply_text(_(u, "zx_short", coins=zx_coins))
        return
    ok = update_user_coins(zx_user["id"], -amount)
    if not ok:
        await update.message.reply_text("Xatolik yuz berdi!")
        return
    u["coins"] = u.get("coins", 0) + amount
    log_tx(u, "zxget", amount, "/zxget")
    save_users(users)
    await update.message.reply_text(_(u, "got_from_zx", amount=amount), reply_markup=web_btn())

async def zxsend(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not FIREBASE_OK:
        await update.message.reply_text("Firebase ulanmagan!")
        return
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u or not u.get("zxmax_uid"):
        await update.message.reply_text(_(u, "need_link"))
        return
    args = context.args
    if not args:
        await update.message.reply_text("/zxsend <miqdor>\nMisol: /zxsend 50")
        return
    try:
        amount = int(args[0])
    except:
        await update.message.reply_text(_(u, "num_required"))
        return
    if amount <= 0:
        await update.message.reply_text(_(u, "num_positive"))
        return
    bot_coins = u.get("coins", 0)
    if bot_coins < amount:
        await update.message.reply_text(_(u, "bot_short", coins=bot_coins))
        return
    ok = update_user_coins(u["zxmax_uid"], amount)
    if not ok:
        await update.message.reply_text("Xatolik yuz berdi!")
        return
    u["coins"] = bot_coins - amount
    log_tx(u, "zxsend", -amount, "/zxsend")
    save_users(users)
    await update.message.reply_text(_(u, "sent_to_zx", amount=amount), reply_markup=web_btn())

async def claim(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not FIREBASE_OK:
        await update.message.reply_text("Firebase ulanmagan!")
        return
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text("Avval /start ni bosing!")
        return
    if not u.get("zxmax_uid"):
        await update.message.reply_text("Avval /link <username> bilan bog'lanishingiz kerak!")
        return
    zx_user = get_user_by_username(u["zxmax_user"])
    if not zx_user:
        await update.message.reply_text("zxmax foydalanuvchisi topilmadi. Qayta /link qiling.")
        return
    pending = zx_user.get("pendingBotAmount", 0)
    if pending <= 0:
        await update.message.reply_text("✅ Sizda kutilayotgan pul yo'q. Saytda tanga yuboring!")
        return
    ok = clear_pending_amount(zx_user["id"])
    if not ok:
        await update.message.reply_text("Xatolik yuz berdi!")
        return
    u["coins"] = u.get("coins", 0) + pending
    log_tx(u, "claim", pending, f"Saytdan {pending}◎ keldi")
    save_users(users)
    await update.message.reply_text(f"✅ {pending}◎ balansingizga qo'shildi!", reply_markup=web_btn())

async def inventory(update: Update, context: ContextTypes.DEFAULT_TYPE):
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text("Avval /start ni bosing!")
        return
    inv = u.get("inventory", [])
    if not inv:
        await update.message.reply_text("📦 Sizda hali hech qanday lot yo'q.")
        return
    args = context.args
    if args:
        # Show specific item details
        q = " ".join(args).lower().strip()
        found = [x for x in inv if q in x["name"].lower() or q in x["id"].lower()]
        if not found:
            await update.message.reply_text(f"❌ \"{q}\" topilmadi. Lotlaringiz: " + ", ".join(x["name"] for x in inv))
            return
        item = found[0]
        caption = (
            f"📦 <b>{item['name']}</b>\n"
            f"⭐ Rarity: {item['rarity']}\n"
            f"🆔 Lot #{item['id']}\n"
            f"💰 Narx: {item['price']}◎\n"
            f"📅 Yutilgan: {item['won_at']}"
        )
        if item.get("file_id"):
            if item.get("media_type") == "video":
                await update.message.reply_video(item["file_id"], caption=caption, parse_mode="HTML")
            else:
                await update.message.reply_photo(item["file_id"], caption=caption, parse_mode="HTML")
        else:
            await update.message.reply_text(caption, parse_mode="HTML")
    else:
        # List all items
        lines = ["📦 <b>Inventarizatsiya</b>\n"]
        for i, x in enumerate(inv, 1):
            lines.append(f"{i}. {x['name']} — ⭐ {x['rarity']} ({x['price']}◎)")
        lines.append(f"\nJami: {len(inv)} ta lot")
        lines.append("Batafsil: /inventory <nomi>")
        await update.message.reply_text("\n".join(lines), parse_mode="HTML")

# ── Admin commands ──

async def givecoins(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    if not context.args or len(context.args) < 2:
        await update.message.reply_text("/givecoins @user <miqdor>")
        return
    target = context.args[0]
    try:
        amount = int(context.args[1])
    except:
        await update.message.reply_text("Miqdorni son qilib yozing!")
        return
    if amount <= 0:
        await update.message.reply_text("Musbat son kiriting!")
        return
    users = load_users()
    tu = None
    for x in users:
        if x.get("username") and f"@{x['username'].lower()}" == target.lower():
            tu = x
            break
        if str(x.get("id")) == target:
            tu = x
            break
    if not tu:
        await update.message.reply_text("Foydalanuvchi topilmadi!")
        return
    tu["coins"] = tu.get("coins", 0) + amount
    log_tx(tu, "givecoins", amount, f"Admin tomonidan {amount}◎ berildi")
    save_users(users)
    await update.message.reply_text(f"✅ {target} ga {amount}◎ berildi!")

async def removecoins(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    if not context.args or len(context.args) < 2:
        await update.message.reply_text("/removecoins @user <miqdor>")
        return
    target = context.args[0]
    try:
        amount = int(context.args[1])
    except:
        await update.message.reply_text("Miqdorni son qilib yozing!")
        return
    if amount <= 0:
        await update.message.reply_text("Musbat son kiriting!")
        return
    users = load_users()
    tu = None
    for x in users:
        if x.get("username") and f"@{x['username'].lower()}" == target.lower():
            tu = x
            break
        if str(x.get("id")) == target:
            tu = x
            break
    if not tu:
        await update.message.reply_text("Foydalanuvchi topilmadi!")
        return
    cur = tu.get("coins", 0)
    if cur < amount:
        await update.message.reply_text(f"❌ Foydalanuvchida {cur}◎ bor, {amount}◎ ni olib bo'lmaydi!")
        return
    tu["coins"] = cur - amount
    log_tx(tu, "removecoins", -amount, f"Admin tomonidan {amount}◎ olindi")
    save_users(users)
    await update.message.reply_text(f"✅ {target} dan {amount}◎ olindi!")

async def setrarity(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    if not context.args or len(context.args) < 2:
        await update.message.reply_text("/setrarity <lot_id> <yangi_rarity>")
        return
    item_id = context.args[0]
    new_rarity = " ".join(context.args[1:])
    auctions = load_auctions()
    if item_id not in auctions:
        await update.message.reply_text(f"❌ Lot #{item_id} topilmadi!")
        return
    auctions[item_id]["rarity"] = new_rarity
    save_auctions(auctions)
    await update.message.reply_text(f"✅ Lot #{item_id} rarity → {new_rarity}")

async def setname(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    if not context.args or len(context.args) < 2:
        await update.message.reply_text("/setname <lot_id> <yangi_nom>")
        return
    item_id = context.args[0]
    new_name = " ".join(context.args[1:])
    auctions = load_auctions()
    if item_id not in auctions:
        await update.message.reply_text(f"❌ Lot #{item_id} topilmadi!")
        return
    auctions[item_id]["name"] = new_name
    save_auctions(auctions)
    await update.message.reply_text(f"✅ Lot #{item_id} nomi → {new_name}")

# ── Transfer ──

async def transfer(update: Update, context: ContextTypes.DEFAULT_TYPE):
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text("Avval /start ni bosing!")
        return
    if not context.args or len(context.args) < 2:
        await update.message.reply_text("/transfer @user <miqdor>")
        return
    target = context.args[0]
    try:
        amount = int(context.args[1])
    except:
        await update.message.reply_text("Miqdorni son qilib yozing!")
        return
    if amount <= 0:
        await update.message.reply_text("Musbat son kiriting!")
        return
    if u.get("coins", 0) < amount:
        await update.message.reply_text(f"❌ Balansingizda {u.get('coins', 0)}◎ bor, {amount}◎ yetarli emas!")
        return
    tu = None
    for x in users:
        if x.get("username") and f"@{x['username'].lower()}" == target.lower():
            tu = x
            break
        if str(x.get("id")) == target:
            tu = x
            break
    if not tu or tu["id"] == u["id"]:
        await update.message.reply_text("❌ Bunday foydalanuvchi topilmadi yoki o'zingizga yubora olmaysiz!")
        return
    u["coins"] -= amount
    tu["coins"] = tu.get("coins", 0) + amount
    log_tx(u, "transfer_out", -amount, f"@{tu.get('username', '?')} ga {amount}◎ yuborildi")
    log_tx(tu, "transfer_in", amount, f"@{u.get('username', '?')} dan {amount}◎ keldi")
    save_users(users)
    await update.message.reply_text(f"✅ {target} ga {amount}◎ yuborildi!")

# ── Shop ──

SHOP_FILE = "shop.json"

def load_shop():
    if not os.path.exists(SHOP_FILE):
        return [{"id": "vip", "name": "VIP Badge", "desc": "Sifatli badge", "price": 500}]
    with open(SHOP_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_shop(items):
    with open(SHOP_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)

SHOP_ITEMS = load_shop()

async def shop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text("Avval /start ni bosing!")
        return
    items = load_shop()
    lines = ["🛍 <b>Do'kon</b>\n"]
    for i, item in enumerate(items, 1):
        lines.append(f"{i}. {item['name']} — {item['price']}◎")
        lines.append(f"   {item['desc']}")
        lines.append(f"   /buy {item['id']}")
    await update.message.reply_text("\n".join(lines), parse_mode="HTML")

async def buy(update: Update, context: ContextTypes.DEFAULT_TYPE):
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text("Avval /start ni bosing!")
        return
    if not context.args:
        await update.message.reply_text("/buy <item_id>")
        return
    item_id = context.args[0].lower()
    items = load_shop()
    shop_item = None
    for si in items:
        if si["id"] == item_id:
            shop_item = si
            break
    if not shop_item:
        await update.message.reply_text(f"❌ '{item_id}' topilmadi! /shop")
        return
    if u.get("coins", 0) < shop_item["price"]:
        await update.message.reply_text(f"❌ Pulingiz yetarli emas! Kerak: {shop_item['price']}◎")
        return
    u["coins"] -= shop_item["price"]
    purchases = u.get("purchases", {})
    purchases[item_id] = purchases.get(item_id, 0) + 1
    u["purchases"] = purchases
    log_tx(u, "buy", -shop_item["price"], f"{shop_item['name']} sotib olindi")
    save_users(users)
    await update.message.reply_text(f"✅ {shop_item['name']} sotib olindi! ({shop_item['price']}◎)")

async def addshop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    args = context.args
    if len(args) < 4:
        await update.message.reply_text("/addshop <id> <name> <price> <desc>")
        return
    item_id = args[0].lower()
    name = args[1]
    try:
        price = int(args[2])
    except:
        await update.message.reply_text("Narx son bo'lishi kerak!")
        return
    desc = " ".join(args[3:])
    items = load_shop()
    for si in items:
        if si["id"] == item_id:
            await update.message.reply_text(f"❌ '{item_id}' allaqachon bor!")
            return
    items.append({"id": item_id, "name": name, "desc": desc, "price": price})
    save_shop(items)
    SHOP_ITEMS.clear()
    SHOP_ITEMS.extend(items)
    await update.message.reply_text(f"✅ {name} ({price}◎) do'konga qo'shildi!")

# ── Daily streak ──

async def daily(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if await check_banned(update): return
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text("Avval /start ni bosing!")
        return
    now = time.time()
    last = u.get("last_daily", 0)
    if now - last < 86400:
        remaining = int(86400 - (now - last))
        h = remaining // 3600
        m = (remaining % 3600) // 60
        await update.message.reply_text(f"⏳ Keyingi bonus {h}h {m}m dan keyin!")
        return
    streak = u.get("daily_streak", 0)
    if now - last < 172800:
        streak += 1
    else:
        streak = 1
    bonus = min(50 + streak * 10, 300)
    u["daily_streak"] = streak
    u["last_daily"] = now
    u["coins"] = u.get("coins", 0) + bonus
    log_tx(u, "daily", bonus, f"Kunlik bonus (streak: {streak})")
    save_users(users)
    await update.message.reply_text(f"✅ {bonus}◎ kunlik bonus! Streak: {streak} kun")

async def send(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if await check_banned(update): return
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text(_(u, "need_start"))
        return
    args = context.args
    if len(args) < 2:
        await update.message.reply_text(_(u, "send_usage"))
        return
    try:
        target_id = int(args[0])
        amount = int(args[1])
    except:
        await update.message.reply_text(_(u, "num_required"))
        return
    if amount <= 0:
        await update.message.reply_text(_(u, "num_positive"))
        return
    if target_id == update.effective_user.id:
        await update.message.reply_text(_(u, "send_self"))
        return
    target = get_user(users, target_id)
    if not target:
        await update.message.reply_text(_(u, "user_not_found"))
        return
    if u.get("coins", 0) < amount:
        await update.message.reply_text(_(u, "bot_short", coins=u.get("coins", 0)))
        return
    u["coins"] = u.get("coins", 0) - amount
    target["coins"] = target.get("coins", 0) + amount
    log_tx(u, "send_out", -amount, f"→ {target.get('name', target_id)}")
    log_tx(target, "send_in", amount, f"← {u.get('name', u['id'])}")
    save_users(users)
    await update.message.reply_text(_(u, "send_done", amount=amount, name=target.get("name", target_id)), reply_markup=web_btn())
    try:
        await context.bot.send_message(
            chat_id=target_id,
            text=_(target, "send_received", amount=amount, name=u.get("name"), total=target["coins"]),
            reply_markup=web_btn(),
        )
    except:
        pass

async def level(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if await check_banned(update): return
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text("Avval /start ni bosing!")
        return
    xp = u.get("xp", 0)
    lvl, progress, needed = get_level(xp)
    total_needed = 0
    for i in range(lvl):
        total_needed += LEVEL_BASE_XP + i * LEVEL_XP_MULT
    total_needed += progress
    bar_len = 12
    filled = int(bar_len * progress / needed) if needed else bar_len
    bar = "🟩" * filled + "⬜" * (bar_len - filled)
    await update.message.reply_text(
        f"⭐ <b>Level {lvl}</b>\n\n"
        f"📊 XP: {progress} / {needed}\n"
        f"{bar}\n"
        f"🔹 Jami XP: {xp}\n"
        f"🎁 Level bonus: {lvl * 50}◎",
        parse_mode="HTML"
    )

async def referral(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if await check_banned(update): return
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text(_(u, "need_start"))
        return
    bot_username = (await context.bot.get_me()).username
    link = f"https://t.me/{bot_username}?start=ref_{update.effective_user.id}"
    await update.message.reply_text(
        _(u, "ref_usage", link=link, bonus=REFERRAL_BONUS, ref_bonus=REFERRAL_REF_BONUS),
        parse_mode="HTML",
        reply_markup=web_btn(),
    )

async def lang(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if await check_banned(update): return
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text("Avval /start ni bosing!")
        return
    args = context.args
    if not args or args[0].lower() not in ("uz", "ru", "kz", "en"):
        await update.message.reply_text(_(u, "lang_usage"))
        return
    lang_code = args[0].lower()
    u["lang"] = lang_code
    save_users(users)
    await update.message.reply_text(_(u, "lang_changed"), reply_markup=web_btn())

async def history(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if await check_banned(update): return
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text(_(u, "need_start"))
        return
    tx_list = u.get("history", [])
    if not tx_list:
        await update.message.reply_text(_(u, "history_empty"))
        return
    lines = [_("", "history_title")]
    for tx in tx_list:
        amt = tx.get("amount", 0)
        sign = "+" if amt >= 0 else ""
        lines.append(_(u, "history_entry", time=tx.get("time", "?"), desc=tx.get("desc", ""), amount=f"{sign}{amt} ◎"))
    text = "\n".join(lines)
    # Split if too long
    if len(text) > 4000:
        text = text[:3997] + "..."
    await update.message.reply_text(text, parse_mode="HTML", reply_markup=web_btn())

async def broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    args = context.args
    if not args:
        await update.message.reply_text("/broadcast <matn>")
        return
    text = " ".join(args)
    all_users = load_users()
    ok = 0
    fail = 0
    for u in all_users:
        try:
            await context.bot.send_message(
                chat_id=u["id"],
                text=f"📢 <b>Admin xabari</b>\n\n{text}",
                parse_mode="HTML",
            )
            ok += 1
        except:
            fail += 1
    admin_user = {"lang": "ru"}
    await update.message.reply_text(_(admin_user, "broadcast_done", count=len(all_users), ok=ok, fail=fail))

# --- NEW FEATURES ---

async def games(update: Update, context: ContextTypes.DEFAULT_TYPE):
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text(_(u, "need_start"))
        return
    if await check_banned(update): return
    lines = [_("", "games_title")]
    for name, desc, url in GAMES_LIST:
        full_url = WEB_URL + url
        lines.append(_(u, "games_entry", url=full_url, name=name, desc=desc))
    await update.message.reply_text("\n".join(lines), parse_mode="HTML", disable_web_page_preview=True, reply_markup=web_btn())

async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    all_users = load_users()
    total = len(all_users)
    today = datetime.date.today().strftime("%Y-%m-%d")
    active = sum(1 for u in all_users if u.get("last_coin", 0) > time.time() - 86400 or u.get("last_daily", 0) > time.time() - 86400)
    total_coins = sum(u.get("coins", 0) for u in all_users)
    top = max(all_users, key=lambda u: u.get("coins", 0)) if all_users else None
    admin_user = {"lang": "ru"}
    text = _(admin_user, "stats_title")
    text += _(admin_user, "stats_users", total=total) + "\n"
    text += _(admin_user, "stats_active", active=active) + "\n"
    text += _(admin_user, "stats_coins", coins=total_coins) + "\n"
    if top:
        text += _(admin_user, "stats_top", name=top.get("name", "?"), coins=top.get("coins", 0))
    await update.message.reply_text(text, parse_mode="HTML")

async def ban(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    args = context.args
    if not args:
        await update.message.reply_text("/ban <id>")
        return
    try:
        target_id = int(args[0])
    except:
        await update.message.reply_text("ID son bo'lishi kerak!")
        return
    banned = load_banned()
    if target_id in banned:
        await update.message.reply_text("Bu foydalanuvchi allaqachon bloklangan!")
        return
    banned.append(target_id)
    save_banned(banned)
    users = load_users()
    u = get_user(users, target_id)
    name = u.get("name", str(target_id)) if u else str(target_id)
    await update.message.reply_text(_({"lang": "ru"}, "ban_done", name=name))

async def unban(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    args = context.args
    if not args:
        await update.message.reply_text("/unban <id>")
        return
    try:
        target_id = int(args[0])
    except:
        await update.message.reply_text("ID son bo'lishi kerak!")
        return
    banned = load_banned()
    if target_id not in banned:
        await update.message.reply_text("Bu foydalanuvchi bloklanmagan!")
        return
    banned.remove(target_id)
    save_banned(banned)
    users = load_users()
    u = get_user(users, target_id)
    name = u.get("name", str(target_id)) if u else str(target_id)
    await update.message.reply_text(_({"lang": "ru"}, "unban_done", name=name))

def gen_top_image(sorted_users):
    width, height = 600, 700
    img = Image.new("RGB", (width, height), (10, 11, 20))
    draw = ImageDraw.Draw(img)
    try:
        font_big = ImageFont.truetype("arialbd.ttf", 32)
        font_small = ImageFont.truetype("arial.ttf", 24)
        font_entry = ImageFont.truetype("arial.ttf", 22)
    except:
        font_big = ImageFont.load_default()
        font_small = font_big
        font_entry = font_big
    # Title
    draw.text((width//2, 30), "🏆 TOP 10", fill=(0, 212, 255), font=font_big, anchor="mt")
    draw.text((width//2, 70), "Eng boy foydalanuvchilar", fill=(100, 100, 130), font=font_small, anchor="mt")
    # Medal colors
    medals = ["#ffd700", "#c0c0c0", "#cd7f32"]
    y = 110
    for i, u in enumerate(sorted_users[:10]):
        color = medals[i] if i < 3 else "#e0e0ff"
        bg_color = (30, 30, 50) if i >= 3 else (40, 35, 30) if i == 0 else (35, 35, 45) if i == 1 else (35, 30, 25)
        draw.rounded_rectangle([(20, y), (580, y+50)], radius=8, fill=bg_color)
        draw.text((40, y+25), f"#{i+1}", fill=color, font=font_entry, anchor="lm")
        name = u.get("name", "?")
        coins = u.get("coins", 0)
        draw.text((110, y+25), name, fill=(224, 224, 255), font=font_entry, anchor="lm")
        draw.text((560, y+25), f"◎ {coins}", fill=(0, 255, 136), font=font_entry, anchor="rm")
        y += 58
    # Footer
    draw.text((width//2, y+30), "zxmax — @zxmax_bot", fill=(80, 80, 110), font=font_small, anchor="mt")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf

async def top(update: Update, context: ContextTypes.DEFAULT_TYPE):
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text("Avval /start ni bosing!")
        return
    if await check_banned(update): return
    sorted_users = sorted([x for x in users if x.get("id") != ADMIN_ID], key=lambda x: x.get("coins", 0), reverse=True)[:10]
    lines = ["🏆 <b>Top 10</b>\n"]
    for i, su in enumerate(sorted_users, 1):
        medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(i, f"{i}.")
        lines.append(f"{medal} {su.get('name', '?')} — {su.get('coins', 0)}◎")
    await update.message.reply_text("\n".join(lines), parse_mode="HTML")

async def topimg(update: Update, context: ContextTypes.DEFAULT_TYPE):
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text(_(u, "need_start"))
        return
    if await check_banned(update): return
    sorted_users = sorted(users, key=lambda x: x.get("coins", 0), reverse=True)
    buf = gen_top_image(sorted_users)
    await update.message.reply_photo(photo=InputFile(buf, filename="top10.png"), reply_markup=web_btn())

async def tasks(update: Update, context: ContextTypes.DEFAULT_TYPE):
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text(_(u, "need_start"))
        return
    if await check_banned(update): return
    today = time.time()
    day_key = datetime.datetime.now().strftime("%Y-%m-%d")
    tasks_data = u.get("tasks", {})
    task_day = tasks_data.get("day", "")
    if task_day == day_key and tasks_data.get("done"):
        await update.message.reply_text(_(u, "tasks_already"), reply_markup=web_btn())
        return
    # Check task progress
    daily_done = 1 if u.get("last_daily", 0) > today - 86400 else 0
    coin_count = tasks_data.get("coin_count", 0) if task_day == day_key else 0
    play_done = 1 if tasks_data.get("play_done") and task_day == day_key else 0
    all_done = daily_done >= 1 and coin_count >= 5 and play_done >= 1
    if not tasks_data or task_day != day_key:
        tasks_data = {"day": day_key, "coin_count": 0, "play_done": False, "done": False}
        u["tasks"] = tasks_data
    # Calculate coin count from today's /coin calls
    if task_day == day_key:
        coin_count = tasks_data.get("coin_count", 0)
    else:
        coin_count = 0
        tasks_data["day"] = day_key
        tasks_data["coin_count"] = 0
        tasks_data["play_done"] = False
        tasks_data["done"] = False
    # Check daily from history
    daily_done = 1 if u.get("last_daily", 0) > today - 86400 else 0
    if daily_done >= 1 and task_day != day_key:
        tasks_data["day"] = day_key
    if task_day == day_key:
        coin_count = tasks_data.get("coin_count", 0)
        # Count /coin calls today from history
        coin_count = sum(1 for tx in u.get("history", []) if tx.get("type") == "coin" and tx.get("time", "").startswith(datetime.datetime.now().strftime("%Y-%m-%d")))
        if coin_count > 5: coin_count = 5
        tasks_data["coin_count"] = coin_count
    play_done = tasks_data.get("play_done", False) if task_day == day_key else False
    all_done = daily_done >= 1 and coin_count >= 5 and play_done
    if all_done and not tasks_data.get("done"):
        reward = 20
        u["coins"] = u.get("coins", 0) + reward
        tasks_data["done"] = True
        log_tx(u, "tasks", reward, "/tasks barchasi bajarildi")
        save_users(users)
        await update.message.reply_text(_(u, "tasks_done_all", reward=reward), reply_markup=web_btn())
        return
    lines = [_("", "tasks_title")]
    lines.append(_(u, "tasks_daily", done=daily_done))
    lines.append(_(u, "tasks_coin", done=coin_count))
    lines.append(_(u, "tasks_play", done=1 if play_done else 0))
    lines.append(_(u, "tasks_reward", reward=20))
    await update.message.reply_text("\n".join(lines), parse_mode="HTML", reply_markup=web_btn())
    save_users(users)

async def poll(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    args = context.args
    if not args:
        await update.message.reply_text("/poll <savol> | variant1 | variant2 | ...\nMisol: /poll Eng yaxshi o'yin? | Flappy | Snake | 2048")
        return
    text = " ".join(args)
    parts = [p.strip() for p in text.split("|")]
    if len(parts) < 2:
        await update.message.reply_text("Savol va kamida 1 variant kiriting!\n/ppoll Savol? | Variant1 | Variant2")
        return
    question = parts[0]
    options = parts[1:]
    if len(options) > 10:
        options = options[:10]
    all_users = load_users()
    ok = 0
    fail = 0
    for u in all_users:
        try:
            await context.bot.send_poll(
                chat_id=u["id"],
                question=question,
                options=options,
                is_anonymous=False,
            )
            ok += 1
        except:
            fail += 1
    await update.message.reply_text(f"✅ So'rovnoma yuborildi!\nMuvaffaqiyatli: {ok}\nXatolik: {fail}")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if await check_banned(update): return
    text = update.message.text.strip()

    # ─── menu buttons ───
    menu_map = {
        "🆘 Help": "start",
        "💰 Balans": "bal",
        "🏦 Bank": "bank",
        "🎮 O'yinlar": "games",
        "🏆 Top": "top",
        "👤 Profil": "profile",
        "🌐 Saytga o'tish": "site",
    }
    if text in menu_map:
        cmd = menu_map[text]
        if cmd == "site":
            await update.message.reply_text("🌐 https://smuratbay957-dot.github.io/zxmax.github.io/zxmax/")
            return
        if cmd == "start":
            await start(update, context)
            return
        if cmd == "bal":
            await balance(update, context)
            return
        if cmd == "bank":
            await bank_deposit(update, context)
            return
        if cmd == "games":
            await games(update, context)
            return
        if cmd == "top":
            await top(update, context)
            return
        if cmd == "profile":
            await profile(update, context)
            return

    if context.user_data.get("awaiting_name"):
        name = update.message.text.strip()
        if not name:
            await update.message.reply_text("Ismni kiriting:")
            return
        users = load_users()
        users = [u for u in users if u["id"] != user.id]
        new_user = {
            "id": user.id,
            "name": name,
            "username": user.username,
            "coins": 0,
            "last_coin": 0,
            "lang": "ru",
            "history": [],
        }
        # Referral bonus
        referred_by = context.user_data.get("referred_by")
        if referred_by:
            referrer = get_user(users, referred_by)
            if referrer:
                new_user["coins"] += REFERRAL_REF_BONUS
                referrer["coins"] = referrer.get("coins", 0) + REFERRAL_BONUS
                log_tx(referrer, "ref_bonus", REFERRAL_BONUS, f"/referral → {name}")
                log_tx(new_user, "ref_bonus", REFERRAL_REF_BONUS, "/referral bonus")
                save_users(users)
                try:
                    await context.bot.send_message(
                        chat_id=referred_by,
                        text=_(referrer, "ref_new_user", name=name, bonus=REFERRAL_BONUS),
                        reply_markup=web_btn(),
                    )
                except:
                    pass
        users.append(new_user)
        log_tx(new_user, "reg", 0, "Ro'yxatdan o'tish")
        save_users(users)
        context.user_data["awaiting_name"] = False
        await context.bot.send_message(
            chat_id=ADMIN_ID,
            text=f"Yangi foydalanuvchi:\nID: {user.id}\nIsm: {name}\nUsername: @{user.username if user.username else 'yoq'}",
        )
        await update.message.reply_text(_(new_user, "reg_done", name=name), reply_markup=menu_keyboard())
        return
    if context.user_data.get("awaiting_bank"):
        try:
            amount = int(update.message.text.strip())
        except:
            await update.message.reply_text("Son kiriting!")
            return
        if amount <= 0:
            await update.message.reply_text("Miqdor 0 dan katta bo'lishi kerak!")
            return
        users = load_users()
        u = get_user(users, user.id)
        if not u or u.get("coins", 0) < amount:
            await update.message.reply_text("Botda yetarli pul yo'q!")
            return
        u["coins"] -= amount
        log_tx(u, "bank_deposit", amount, "Bankka pul qo'yildi")
        bank = load_bank()
        uid = str(user.id)
        if uid not in bank["users"]:
            bank["users"][uid] = {"name": u.get("name", str(user.id)), "amount": amount, "deposited_at": time.time()}
        else:
            bank["users"][uid]["amount"] = bank["users"][uid].get("amount", 0) + amount
            bank["users"][uid]["deposited_at"] = time.time()
        bank["total"] += amount
        save_users(users)
        save_bank(bank)
        context.user_data["awaiting_bank"] = False
        await update.message.reply_text(f"✅ {amount}◎ bankka qo'yildi!")
        return
    users = load_users()
    u = get_user(users, user.id)
    if u:
        await update.message.reply_text(_(u, "balance", name=u["name"], coins=u.get("coins", 0)), reply_markup=web_btn())
    else:
        await update.message.reply_text("/start ni bosing", reply_markup=web_btn())

async def zxauct(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    replied = update.message.reply_to_message
    if not replied:
        await update.message.reply_text("Rasm yoki videoga reply qiling!")
        return
    if not replied.photo and not replied.video:
        await update.message.reply_text("Faqat rasm yoki video!")
        return
    args = context.args
    if not args:
        await update.message.reply_text("Misol: /zxauct 1, Oltin soat, legendary")
        return
    text = " ".join(args)
    parts = [p.strip() for p in text.split(",")]
    if len(parts) < 3:
        await update.message.reply_text("Misol: /zxauct 1, Oltin soat, legendary")
        return
    item_id = parts[0]
    name = parts[1]
    rarity = parts[2]
    auctions = load_auctions()
    auctions[item_id] = {
        "id": item_id,
        "name": name,
        "rarity": rarity,
        "media_type": "video" if replied.video else "photo",
        "file_id": replied.video.file_id if replied.video else replied.photo[-1].file_id,
        "created_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    save_auctions(auctions)
    await update.message.reply_text(f"✅ {name} ({rarity}) qo'shildi! ID: {item_id}")

async def auction(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    args = context.args
    if not args:
        await update.message.reply_text("/auction ID, Nomi, rarity, narx\nMisol: /auction 1, Oltin soat, legendary, 1200")
        return
    text = " ".join(args)
    parts = [p.strip() for p in text.split(",")]
    if len(parts) < 4:
        await update.message.reply_text("Format: /auction ID, Nomi, rarity, narx")
        return
    item_id = parts[0]
    name = parts[1]
    rarity = parts[2]
    price = parts[3]
    auctions = load_auctions()
    item = auctions.get(item_id)
    if not item:
        await update.message.reply_text(f"❌ Lot #{item_id} topilmadi! Avval /zxauct bilan yarating.")
        return
    channel_username = CHANNEL_URL.replace("https://t.me/", "@")
    try:
        chat_obj = await context.bot.get_chat(channel_username)
        chat_id = chat_obj.id
    except:
        await update.message.reply_text("❌ Kanal topilmadi!")
        return
    caption = (
        f"🏆 <b>Auction</b>\n\n"
        f"📦 {name}\n"
        f"⭐ Rarity: {rarity}\n"
        f"💰 Boshlang'ich narx: {price} ◎\n"
        f"🆔 Lot #{item_id}\n\n"
        f"Bot: @{context.bot.username}"
    )
    bid_kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("+100◎", callback_data=f"bid_{item_id}_100"),
         InlineKeyboardButton("+150◎", callback_data=f"bid_{item_id}_150"),
         InlineKeyboardButton("+200◎", callback_data=f"bid_{item_id}_200"),
         InlineKeyboardButton("+500◎", callback_data=f"bid_{item_id}_500")],
        [InlineKeyboardButton("📊 Tarix", callback_data=f"bid_history_{item_id}")],
    ])
    item["current_price"] = int(price)
    item["highest_bidder"] = None
    item["highest_bidder_name"] = None
    item["active"] = True
    item["bid_count"] = 0
    item["bids"] = []
    item["end_at"] = 0
    save_auctions(auctions)
    if item["media_type"] == "video":
        msg = await context.bot.send_video(chat_id, item["file_id"], caption=caption, parse_mode="HTML", reply_markup=bid_kb)
    else:
        msg = await context.bot.send_photo(chat_id, item["file_id"], caption=caption, parse_mode="HTML", reply_markup=bid_kb)
    item["message_id"] = msg.message_id
    item["chat_id"] = chat_id
    save_auctions(auctions)

async def bid_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data
    if data.startswith("bid_history_"):
        item_id = data.split("_")[2]
        auctions = load_auctions()
        item = auctions.get(item_id)
        if not item:
            await context.bot.send_message(query.from_user.id, "❌ Lot topilmadi!")
            return
        bids = item.get("bids", [])
        if not bids:
            await context.bot.send_message(query.from_user.id, "📊 Hali hech kim bid qilmagan.")
            return
        lines = [f"📊 <b>Auction #{item_id} tarixi</b>\n"]
        for i, b in enumerate(bids, 1):
            lines.append(f"{i}. {b['user']} — +{b['amount']}◎ ({b['time']})")
        await context.bot.send_message(query.from_user.id, "\n".join(lines), parse_mode="HTML")
        return
    if not data.startswith("bid_"):
        return
    parts = data.split("_")
    item_id = parts[1]
    bid_amount = int(parts[2])
    user = query.from_user
    users = load_users()
    u = get_user(users, user.id)
    if not u:
        await context.bot.send_message(user.id, "Avval /start ni bosing!")
        return
    auctions = load_auctions()
    item = auctions.get(item_id)
    if not item:
        await query.edit_message_caption(caption=query.message.caption + "\n\n❌ Lot topilmadi!", parse_mode="HTML")
        return
    if not item.get("active"):
        await context.bot.send_message(user.id, "❌ Bu auction tugagan!")
        return
    if item["highest_bidder"] == user.id:
        await context.bot.send_message(user.id, f"⚠️ Siz allaqachon eng yuqori narxni taklif qilgansiz!")
        return
    new_price = item["current_price"] + bid_amount
    total_money, balance, deposit = get_user_total_money(user.id)
    if total_money < new_price:
        await context.bot.send_message(user.id, f"❌ Pulingiz yetarli emas! Kerak: {new_price}◎, sizda: {total_money}◎ (balans: {balance}◎, bank: {deposit}◎)")
        return
    item["current_price"] = new_price
    item["highest_bidder"] = user.id
    item["highest_bidder_name"] = user.full_name or user.username or str(user.id)
    item["bid_count"] = item.get("bid_count", 0) + 1
    bids = item.get("bids", [])
    bids.append({"user": item["highest_bidder_name"], "amount": bid_amount, "time": datetime.datetime.now().strftime("%H:%M")})
    item["bids"] = bids
    item["end_at"] = int(time.time()) + 10
    save_auctions(auctions)
    caption = (
        f"🏆 <b>Auction</b>\n\n"
        f"📦 {item['name']}\n"
        f"⭐ Rarity: {item['rarity']}\n"
        f"💰 Joriy narx: {new_price} ◎\n"
        f"👤 Eng yuqori: {item['highest_bidder_name']}\n"
        f"🆔 Lot #{item_id}\n"
        f"⏱ 10 soniya"
    )
    try:
        await context.bot.edit_message_caption(chat_id=item["chat_id"], message_id=item["message_id"], caption=caption, parse_mode="HTML", reply_markup=query.message.reply_markup)
    except:
        pass
    await context.bot.send_message(user.id, f"✅ Siz {bid_amount}◎ qo'shdingiz! Yangi narx: {new_price}◎")
    # Start 10s timer for auction end
    asyncio.create_task(auction_timer(context.application.bot, item_id, item["bid_count"]))

async def auction_timer(bot, item_id, bid_count_at_start):
    await asyncio.sleep(10)
    auctions = load_auctions()
    item = auctions.get(item_id)
    if not item or not item.get("active"):
        return
    if item.get("bid_count", 0) != bid_count_at_start:
        return  # New bid placed, skip
    item["active"] = False
    save_auctions(auctions)
    winner_id = item["highest_bidder"]
    winner_name = item["highest_bidder_name"]
    price = item["current_price"]
    # Take money from winner
    users = load_users()
    u = get_user(users, winner_id)
    bank = load_bank()
    if u:
        uid = str(winner_id)
        dep = bank["users"].get(uid, {}).get("amount", 0)
        take_from_bank = min(dep, price)
        take_from_balance = price - take_from_bank
        if uid in bank["users"]:
            bank["users"][uid]["amount"] -= take_from_bank
        u["coins"] = u.get("coins", 0) - take_from_balance
        bank["total"] += take_from_balance
        log_tx(u, "auction_win", price, f"Auction #{item_id} yutib olindi")
        # Add item to winner's inventory
        inv = u.get("inventory", [])
        inv.append({
            "id": item_id,
            "name": item["name"],
            "rarity": item["rarity"],
            "file_id": item.get("file_id", ""),
            "media_type": item.get("media_type", "photo"),
            "price": price,
            "won_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        })
        u["inventory"] = inv
        save_users(users)
        save_bank(bank)
        try:
            await bot.send_message(winner_id, f"🎉 Siz auction #{item_id} ni yutib oldingiz! Narx: {price}◎")
        except:
            pass
    # Update channel post
    caption = (
        f"🏆 <b>Auction yakunlandi!</b>\n\n"
        f"📦 {item['name']}\n"
        f"⭐ {item['rarity']}\n"
        f"💰 Narx: {price}◎\n"
        f"👤 Yutdi: {winner_name}\n"
        f"🆔 Lot #{item_id}"
    )
    try:
        await bot.edit_message_caption(chat_id=item["chat_id"], message_id=item["message_id"], caption=caption, parse_mode="HTML")
    except:
        pass

async def bank_deposit(update: Update, context: ContextTypes.DEFAULT_TYPE):
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text("Avval /start ni bosing!")
        return
    uid = str(update.effective_user.id)
    bank = load_bank()
    dep_info = bank["users"].get(uid, {})
    dep_amount = dep_info.get("amount", 0)
    if dep_amount > 0 and dep_info.get("deposited_at"):
        total_with_interest = calc_bank_total(dep_amount, dep_info["deposited_at"])
        interest = total_with_interest - dep_amount
    else:
        total_with_interest = 0
        interest = 0
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("📥 Pul qo'yish", callback_data="bank_deposit")],
        [InlineKeyboardButton("📤 Pul yechish", callback_data="bank_withdraw")],
    ])
    await update.message.reply_text(
        f"🏦 <b>Sizning bankingiz</b>\n\n"
        f"💰 Asosiy deposit: {dep_amount} ◎\n"
        f"📈 Foiz: +{interest} ◎\n"
        f"💵 Jami: {total_with_interest} ◎\n"
        f"🪙 Bot balansingiz: {u.get('coins', 0)} ◎\n\n"
        f"Har bir haftada 10% foiz qo'shiladi!",
        parse_mode="HTML", reply_markup=kb
    )

async def zxbank(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    bank = load_bank()
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("👥 Kimlar bankka qancha qo'yganini ko'rish", callback_data="bank_users_0")],
    ])
    await update.message.reply_text(
        f"🏦 <b>Bank</b>\n\n💰 Umumiy pul: {bank['total']} ◎",
        parse_mode="HTML", reply_markup=kb
    )

async def bank_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    data = query.data
    if data == "bank_main":
        await query.answer()
        bank = load_bank()
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("👥 Kimlar bankka qancha qo'yganini ko'rish", callback_data="bank_users_0")],
        ])
        await query.edit_message_text(
            f"🏦 <b>Bank</b>\n\n💰 Umumiy pul: {bank['total']} ◎",
            parse_mode="HTML", reply_markup=kb
        )
    elif data == "bank_deposit":
        await query.answer()
        context.user_data["awaiting_bank"] = True
        users = load_users()
        u = get_user(users, update.effective_user.id)
        balance = u.get("coins", 0) if u else 0
        await query.edit_message_text(
            f"💰 Qancha pul qo'yasiz?\n\n🪙 Bot balansingiz: {balance} ◎\n\nMiqdorni yozing:"
        )
    elif data == "bank_withdraw":
        await query.answer()
        uid = str(update.effective_user.id)
        bank = load_bank()
        dep_info = bank["users"].get(uid)
        if not dep_info or dep_info.get("amount", 0) <= 0:
            await query.edit_message_text("❌ Sizda bankda pul yo'q!")
            return
        dep_amount = dep_info["amount"]
        if dep_info.get("deposited_at"):
            total = calc_bank_total(dep_amount, dep_info["deposited_at"])
        else:
            total = dep_amount
        interest = total - dep_amount
        bank["users"].pop(uid, None)
        bank["total"] -= total
        users = load_users()
        u = get_user(users, update.effective_user.id)
        if u:
            u["coins"] = u.get("coins", 0) + total
            log_tx(u, "bank_withdraw", total, f"Bankdan yechildi (deposit: {dep_amount}, foiz: {interest})")
        save_users(users)
        save_bank(bank)
        await query.edit_message_text(f"✅ {total}◎ bankdan yechildi! (asosiy: {dep_amount}◎, foiz: +{interest}◎)")
    elif data.startswith("bank_users_"):
        await query.answer()
        bank = load_bank()
        idx = int(data.split("_")[2])
        user_ids = list(bank["users"].keys())
        if not user_ids:
            await query.edit_message_text("🏦 <b>Bank</b>\n\nHali hech kim pul qo'ymagan.", parse_mode="HTML")
            return
        if idx >= len(user_ids):
            idx = 0
        uid = user_ids[idx]
        uinfo = bank["users"][uid]
        name = uinfo.get("name", uid)
        amount = uinfo.get("amount", 0)
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("⬅ Orqaga", callback_data="bank_main"),
             InlineKeyboardButton(f"💰 {uid} ga 100 berish" if update.effective_user.id == ADMIN_ID else f"💰 100 berish", callback_data=f"bank_give_{uid}"),
             InlineKeyboardButton("➡ Keyingi", callback_data=f"bank_users_{idx+1}")],
        ])
        await query.edit_message_text(
            f"🏦 <b>Bank</b>\n\n👤 {name}\n💰 Qo'ygan: {amount} ◎\n\n{idx+1}/{len(user_ids)}",
            parse_mode="HTML", reply_markup=kb
        )
    elif data.startswith("bank_give_"):
        if update.effective_user.id != ADMIN_ID:
            await query.answer("Faqat admin!⚠️")
            return
        await query.answer()
        uid = data.split("_")[2]
        bank = load_bank()
        if uid not in bank["users"] or bank["users"][uid]["amount"] < 100:
            await query.edit_message_text("❌ Bu foydalanuvchida yetarli pul yo'q!", parse_mode="HTML")
            return
        if bank["total"] < 100:
            await query.edit_message_text("❌ Bankda yetarli pul yo'q!", parse_mode="HTML")
            return
        bank["users"][uid]["amount"] -= 100
        bank["total"] -= 100
        users = load_users()
        u = get_user(users, int(uid))
        if u:
            u["coins"] = u.get("coins", 0) + 100
            log_tx(u, "bank", 100, "Bankdan 100◎ berildi")
        save_users(users)
        save_bank(bank)
        await query.edit_message_text(f"✅ {bank['users'][uid].get('name', uid)} ga 100◎ berildi!", parse_mode="HTML")

MONTH_SECONDS = 2592000  # 30 days

async def credit(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if await check_banned(update): return
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text("Avval /start ni bosing!")
        return
    args = context.args
    if not args:
        await update.message.reply_text("Misol: /credit 1000\nMin 1000, max 10000")
        return
    try:
        amount = int(args[0])
    except:
        await update.message.reply_text("Miqdor son bo'lishi kerak!")
        return
    if amount < 1000 or amount > 10000:
        await update.message.reply_text("Min 1000, max 10000!")
        return
    if u.get("credit_principal", 0) > 0:
        await update.message.reply_text("Sizda hali to'lanmagan qarz bor! Avval /repay qiling.")
        return
    bank = load_bank()
    if bank["total"] < amount:
        await update.message.reply_text("❌ Bankda yetarli pul yo'q!")
        return
    fee = int(amount * 0.2)
    total_owed = amount + fee
    now = time.time()
    u["credit_principal"] = amount
    u["credit_total"] = total_owed
    u["credit_taken_at"] = now
    u["credit_last_interest"] = now
    u["coins"] = u.get("coins", 0) + amount
    bank["total"] -= amount
    log_tx(u, "credit", amount, f"Bankdan qarz ({amount}+{fee} foiz = {total_owed} qarz)")
    save_users(users)
    save_bank(bank)
    await update.message.reply_text(
        f"✅ {amount}◎ qarz olindi!\n"
        f"💰 20% xizmat haqi: +{fee}◎\n"
        f"💵 Jami qarz: {total_owed}◎\n"
        f"📈 Oyiga 10% foiz qo'shiladi\n\n"
        f"/repay — qarzni qaytarish"
    )

async def repay(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if await check_banned(update): return
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text("Avval /start ni bosing!")
        return
    principal = u.get("credit_principal", 0)
    if principal <= 0:
        await update.message.reply_text("Sizda qarz yo'q!")
        return
    current_total = u["credit_total"]
    now = time.time()
    last_interest = u.get("credit_last_interest", now)
    months_passed = int((now - last_interest) // MONTH_SECONDS)
    if months_passed > 0:
        for _ in range(months_passed):
            current_total += int(current_total * 0.1)
        u["credit_last_interest"] = last_interest + (months_passed * MONTH_SECONDS)
        u["credit_total"] = current_total
    if u.get("coins", 0) < current_total:
        await update.message.reply_text(
            f"❌ Yetarli pul yo'q!\n"
            f"💵 Qarzingiz: {current_total}◎\n"
            f"🪙 Balansingiz: {u.get('coins', 0)}◎"
        )
        return
    u["coins"] -= current_total
    bank = load_bank()
    bank["total"] += current_total
    log_tx(u, "repay", -current_total, f"Qarz qaytarildi ({current_total}◎)")
    u["credit_principal"] = 0
    u["credit_total"] = 0
    u["credit_taken_at"] = 0
    u["credit_last_interest"] = 0
    save_users(users)
    save_bank(bank)
    await update.message.reply_text(f"✅ Qarz to'liq qaytarildi! Jami: {current_total}◎")

def apply_credit_interest(u, users):
    principal = u.get("credit_principal", 0)
    if principal <= 0:
        return
    now = time.time()
    last_interest = u.get("credit_last_interest", now)
    months_passed = int((now - last_interest) // MONTH_SECONDS)
    if months_passed <= 0:
        return
    total = u["credit_total"]
    deducted_total = 0
    for _ in range(months_passed):
        interest = int(total * 0.1)
        total += interest
        if u.get("coins", 0) >= interest:
            u["coins"] -= interest
            deducted_total += interest
            log_tx(u, "credit_interest", -interest, f"Kredit foizi (10% oy)")
            u["credit_last_interest"] += MONTH_SECONDS
        else:
            u["coins"] = 0
            deducted_total += interest
            log_tx(u, "credit_interest", -interest, f"Kredit foizi (10% oy, balans yetarsiz)")
            u["credit_last_interest"] += MONTH_SECONDS
            break
    u["credit_total"] = total
    if deducted_total > 0:
        bank = load_bank()
        bank["total"] += deducted_total
        save_bank(bank)

async def giftall(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    args = context.args
    if not args:
        await update.message.reply_text("/giftall <miqdor>")
        return
    try:
        amount = int(args[0])
    except:
        await update.message.reply_text("Miqdor son bo'lishi kerak!")
        return
    if amount <= 0:
        await update.message.reply_text("Miqdor 0 dan katta bo'lishi kerak!")
        return
    users = load_users()
    count = 0
    for u in users:
        if u.get("id") == ADMIN_ID:
            continue
        u["coins"] = u.get("coins", 0) + amount
        log_tx(u, "giftall", amount, f"Admin hammaga {amount}◎ sovg'a")
        count += 1
    save_users(users)
    await update.message.reply_text(f"✅ {count} ta foydalanuvchiga {amount}◎ dan berildi!")

async def resetcoins(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    args = context.args
    if not args:
        await update.message.reply_text("/resetcoins @user\nMisol: /resetcoins @username")
        return
    target_input = args[0].lstrip("@")
    users = load_users()
    target = None
    for u in users:
        if u.get("username", "").lower() == target_input.lower():
            target = u
            break
    if not target:
        await update.message.reply_text("❌ Foydalanuvchi topilmadi!")
        return
    old_coins = target.get("coins", 0)
    target["coins"] = 0
    log_tx(target, "resetcoins", -old_coins, f"Admin tomonidan nollandi")
    save_users(users)
    await update.message.reply_text(f"✅ {target.get('name')} ning tangalari nollandi! (oldingi: {old_coins}◎)")

async def setbank(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID:
        await update.message.reply_text("Faqat admin uchun!")
        return
    args = context.args
    if not args:
        await update.message.reply_text("/setbank <miqdor>")
        return
    try:
        amount = int(args[0])
    except:
        await update.message.reply_text("Miqdor son bo'lishi kerak!")
        return
    if amount < 0:
        await update.message.reply_text("Miqdor 0 yoki undan katta bo'lishi kerak!")
        return
    bank = load_bank()
    bank["total"] = amount
    save_bank(bank)
    await update.message.reply_text(f"✅ Bank totali {amount}◎ qilib o'rnatildi!")

async def gift(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if await check_banned(update): return
    users = load_users()
    u = get_user(users, update.effective_user.id)
    if not u:
        await update.message.reply_text("Avval /start ni bosing!")
        return
    args = context.args
    if len(args) < 2:
        await update.message.reply_text("Misol: /gift @user 100")
        return
    target_input = args[0].lstrip("@")
    try:
        amount = int(args[1])
    except:
        await update.message.reply_text("Miqdor son bo'lishi kerak!")
        return
    if amount <= 0:
        await update.message.reply_text("Miqdor 0 dan katta bo'lishi kerak!")
        return
    if u.get("coins", 0) < amount:
        await update.message.reply_text(f"❌ Yetarli tanga yo'q! ({u.get('coins', 0)}◎)")
        return
    target = None
    for us in users:
        if us.get("username", "").lower() == target_input.lower():
            target = us
            break
    if not target:
        await update.message.reply_text("❌ Foydalanuvchi topilmadi!")
        return
    if target["id"] == update.effective_user.id:
        await update.message.reply_text("O'zingizga sovg'a qila olmaysiz!")
        return
    u["coins"] -= amount
    target["coins"] = target.get("coins", 0) + amount
    log_tx(u, "gift_out", -amount, f"🎁 {target.get('name')} ga sovg'a")
    log_tx(target, "gift_in", amount, f"🎁 {u.get('name')} dan sovg'a")
    save_users(users)
    await update.message.reply_text(f"✅ {target.get('name')} ga {amount}◎ sovg'a qilindi!")
    try:
        await context.bot.send_message(
            chat_id=target["id"],
            text=f"🎁 {u.get('name')} sizga {amount}◎ sovg'a qildi!",
        )
    except:
        pass

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("bal", balance))
    app.add_handler(CommandHandler("balance", balance))
    app.add_handler(CommandHandler("coin", coin))
    app.add_handler(CommandHandler("profile", profile))
    app.add_handler(CommandHandler("level", level))
    app.add_handler(CommandHandler("addcoins", addcoins))
    app.add_handler(CommandHandler("help", help))
    app.add_handler(CommandHandler("users", users))
    app.add_handler(CommandHandler("link", link))
    app.add_handler(CommandHandler("zxbal", zxbal))
    app.add_handler(CommandHandler("zxget", zxget))
    app.add_handler(CommandHandler("zxsend", zxsend))
    app.add_handler(CommandHandler("top", top))
    app.add_handler(CommandHandler("topimg", topimg))
    app.add_handler(CommandHandler("daily", daily))
    app.add_handler(CommandHandler("send", send))
    app.add_handler(CommandHandler("referral", referral))
    app.add_handler(CommandHandler("lang", lang))
    app.add_handler(CommandHandler("history", history))
    app.add_handler(CommandHandler("broadcast", broadcast))
    app.add_handler(CommandHandler("games", games))
    app.add_handler(CommandHandler("stats", stats))
    app.add_handler(CommandHandler("ban", ban))
    app.add_handler(CommandHandler("unban", unban))
    app.add_handler(CommandHandler("tasks", tasks))
    app.add_handler(CommandHandler("poll", poll))
    app.add_handler(CommandHandler("bank", bank_deposit))
    app.add_handler(CommandHandler("zxauct", zxauct))
    app.add_handler(CommandHandler("auction", auction))
    app.add_handler(CommandHandler("zxbank", zxbank))
    app.add_handler(CommandHandler("claim", claim))
    app.add_handler(CommandHandler("inventory", inventory))
    app.add_handler(CommandHandler("givecoins", givecoins))
    app.add_handler(CommandHandler("removecoins", removecoins))
    app.add_handler(CommandHandler("setrarity", setrarity))
    app.add_handler(CommandHandler("setname", setname))
    app.add_handler(CommandHandler("transfer", transfer))
    app.add_handler(CommandHandler("shop", shop))
    app.add_handler(CommandHandler("buy", buy))
    app.add_handler(CommandHandler("addshop", addshop))
    app.add_handler(CommandHandler("credit", credit))
    app.add_handler(CommandHandler("repay", repay))
    app.add_handler(CommandHandler("giftall", giftall))
    app.add_handler(CommandHandler("resetcoins", resetcoins))
    app.add_handler(CommandHandler("setbank", setbank))
    app.add_handler(CommandHandler("gift", gift))
    app.add_handler(CallbackQueryHandler(bid_handler, pattern="^bid_"))
    app.add_handler(CallbackQueryHandler(bank_handler, pattern="^bank_"))
    app.add_handler(CallbackQueryHandler(help_callback, pattern="^help$"))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    # Webhook mode support
    webhook_url = os.environ.get("WEBHOOK_URL")
    if webhook_url:
        port = int(os.environ.get("PORT", 8443))
        print(f"Webhook rejimida ishga tushdi: {webhook_url}")
        app.run_webhook(listen="0.0.0.0", port=port, url_path=TOKEN, webhook_url=webhook_url)
    else:
        print("Bot polling rejimida ishga tushdi...")
        app.run_polling()

if __name__ == "__main__":
    main()
