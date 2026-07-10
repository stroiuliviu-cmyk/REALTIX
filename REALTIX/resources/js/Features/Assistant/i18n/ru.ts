// resources/js/Features/Assistant/i18n/ru.ts
//
// Trebuie să acopere exact aceleași chei ca `ro` (verificat prin tipul
// Record<TranslationKey, string> de mai jos).

import type { TranslationKey } from './index';

export const ru: Record<TranslationKey, string> = {
  'placeholder.input': 'Напишите, что ищете…',
  'suggestions.title': 'Попробуйте',
  'lang.hint': 'Можно писать по-румынски или по-русски · Enter — отправить',

  'eyebrow': 'AI-ассистент по недвижимости',
  'empty.title': 'Найди жильё через диалог',
  'empty.sub': 'Скажи, что ищешь, своими словами. Я найду и сравню объекты из всех источников — без сложных форм.',

  'thinking.search': 'Ассистент ищет объекты…',
  'thinking.text': 'Ассистент думает…',

  'badge.external': 'Внешний',
  'badge.unavailable': 'Недоступен',

  'state.no_results': 'Ничего не найдено. Попробуйте смягчить критерии.',
  'state.error': 'Что-то пошло не так. Попробуйте ещё раз.',
  'state.rate_limited': 'Вы достигли лимита сообщений для этой сессии. Создайте аккаунт, чтобы продолжить.',

  'zero.title': 'Точных совпадений нет',
  'zero.sub': 'Попробуй смягчить критерии — например, увеличь бюджет или расширь район поиска.',
  'error.title': 'Ошибка поиска',
  'error.sub': 'Не удалось завершить поиск.',
  'rate.title': 'Лимит достигнут',
  'rate.sub': 'Создай бесплатный аккаунт, чтобы продолжить диалог и сохранять поиски.',

  'btn.favorite': 'В избранное',
  'btn.favorited': 'Сохранено',
  'btn.contact': 'Связаться',
  'btn.relax_filters': 'Смягчить критерии',
  'btn.show_more': 'Показать ещё',
  'btn.view_listings': 'Смотреть объекты',
  'btn.signup': 'Регистрация',
  'btn.login': 'Войти',
  'btn.retry': 'Повторить',
  'btn.start_search': 'Начать поиск',
  'btn.new_chat': 'Новый диалог',
  'btn.close': 'Закрыть',
  'btn.send': 'Отправить',

  'nav.favorites': 'Избранное',
  'nav.conversations': 'Мои диалоги',

  'detail.listed_by': 'Размещено',
  'detail.source': 'Источник',
  'agency.public_suffix': 'публичных объектов',

  'gate.title': 'Создай аккаунт, чтобы связаться',
  'gate.sub': 'Чтобы защитить твою анонимность в сделке, общение с агентствами проходит в приложении — без телефонов и email.',
  'gate.note': 'Без контактных данных. Общение напрямую и безопасно, через внутренний чат.',
  'gate.chat_title': 'Диалог с агентством',
  'gate.chat_note': 'Контактные данные скрыты для обеих сторон.',
  'gate.agent_msg': 'Здравствуйте! Спасибо за интерес к объекту. Когда удобно записаться на просмотр?',
  'gate.reply_ph': 'Напишите сообщение…',

  'fav.empty_title': 'Пока ничего не сохранено',
  'fav.empty_sub': 'Нажми на сердце у любого объекта, чтобы сохранить его здесь и сравнить позже.',

  'convos.empty': 'Здесь появятся ваши диалоги.',
  'convos.current': 'Текущий диалог',
  'convos.untitled': 'Диалог без названия',
  'convos.messages': 'сообщений',

  'composer.voice_off': 'Голос отключён (MVP)',
  'composer.image_off': 'Прикрепление изображений отключено (MVP)',

  'paywall.title': 'Вы использовали 50 бесплатных результатов',
  'paywall.sub': 'Создайте аккаунт и купите дополнительный лимит, чтобы продолжить поиск. Уже просмотренные объекты остаются бесплатными.',
  'paywall.cta': 'Создать аккаунт и купить лимит',
  'paywall.dismiss': 'Позже',
};
