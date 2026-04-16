// @ts-check

import { renderLOCCard } from "../src/cards/loc.js";
import { guardAccess } from "../src/common/access.js";
import {
  CACHE_TTL,
  resolveCacheSeconds,
  setCacheHeaders,
  setErrorCacheHeaders,
} from "../src/common/cache.js";
import { parseBoolean } from "../src/common/ops.js";
import { renderError } from "../src/common/render.js";
import { fetchLOCStats } from "../src/fetchers/loc.js";

// @ts-ignore
export default async (req, res) => {
  const {
    username,
    hide_border,
    hide_title,
    card_width,
    title_color,
    icon_color,
    text_color,
    bg_color,
    theme,
    cache_seconds,
    custom_title,
    border_radius,
    border_color,
    disable_animations,
    show_icons,
  } = req.query;

  res.setHeader("Content-Type", "image/svg+xml");

  const access = guardAccess({
    res,
    id: username,
    type: "username",
    colors: {
      title_color,
      text_color,
      bg_color,
      border_color,
      theme,
    },
  });

  if (!access.isPassed) {
    return access.result;
  }

  try {
    const targetUsername = username || "Build-with-Akshit";
    const stats = await fetchLOCStats(targetUsername);

    const cacheSeconds = resolveCacheSeconds({
      requested: parseInt(cache_seconds, 10),
      def: CACHE_TTL.STATS_CARD.DEFAULT,
      min: CACHE_TTL.STATS_CARD.MIN,
      max: CACHE_TTL.STATS_CARD.MAX,
    });

    setCacheHeaders(res, cacheSeconds);

    return res.send(
      renderLOCCard(stats, {
        custom_title,
        hide_border: parseBoolean(hide_border),
        hide_title: parseBoolean(hide_title),
        card_width: parseInt(card_width, 10),
        border_radius: parseInt(border_radius, 10),
        title_color,
        text_color,
        icon_color,
        bg_color,
        border_color,
        theme,
        disable_animations: parseBoolean(disable_animations),
        show_icons: parseBoolean(show_icons),
      }),
    );
  } catch (err) {
    setErrorCacheHeaders(res);
    return res.send(
      renderError({
        message: err.message,
        secondaryMessage: err.secondaryMessage,
        renderOptions: {
          title_color,
          text_color,
          bg_color,
          border_color,
          theme,
        },
      }),
    );
  }
};
