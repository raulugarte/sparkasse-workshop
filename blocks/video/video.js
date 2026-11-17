/**
 * Video block: embeds the linked video when it scrolls into view.
 * Supports Adobe Video (video.tv.adobe.com), YouTube, Vimeo and .mp4 files.
 * An optional picture in the cell is shown as poster with a play button.
 * @param {Element} block the video block
 */

/**
 * @param {URL} url video URL
 * @returns {string|null} iframe src for embeddable players
 */
function embedSrc(url) {
  const { hostname, pathname, searchParams } = url;
  if (hostname === 'video.tv.adobe.com') {
    const id = pathname.match(/\/v\/(\d+)/)?.[1];
    return id ? `https://video.tv.adobe.com/v/${id}?${searchParams.toString()}` : null;
  }
  if (hostname.includes('youtube.com') || hostname === 'youtu.be') {
    const id = hostname === 'youtu.be' ? pathname.slice(1) : searchParams.get('v');
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0` : null;
  }
  if (hostname.includes('vimeo.com')) {
    const id = pathname.split('/').filter(Boolean).pop();
    return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}` : null;
  }
  return null;
}

function buildPlayer(url, autoplay) {
  if (/\.mp4$/i.test(url.pathname)) {
    const video = document.createElement('video');
    video.controls = true;
    if (autoplay) video.autoplay = true;
    const source = document.createElement('source');
    source.src = url.href;
    source.type = 'video/mp4';
    video.append(source);
    return video;
  }
  const src = embedSrc(url);
  if (!src) return null;
  const iframe = document.createElement('iframe');
  iframe.src = autoplay ? `${src}${src.includes('?') ? '&' : '?'}autoplay=1` : src;
  iframe.title = 'Video';
  iframe.loading = 'lazy';
  iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
  iframe.allowFullscreen = true;
  return iframe;
}

export default function decorate(block) {
  const link = block.querySelector('a[href]');
  if (!link) {
    block.remove();
    return;
  }
  let url;
  try {
    url = new URL(link.href);
  } catch (e) {
    return; // keep the authored link visible
  }
  const poster = block.querySelector('picture');
  const frame = document.createElement('div');
  frame.className = 'video-frame';

  const load = (autoplay) => {
    if (block.dataset.embedLoaded) return;
    const player = buildPlayer(url, autoplay);
    if (!player) return; // unsupported: the plain link stays as fallback
    block.dataset.embedLoaded = 'true';
    frame.replaceChildren(player);
    block.replaceChildren(frame);
  };

  if (poster) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'video-play';
    button.setAttribute('aria-label', 'Play video');
    frame.append(poster, button);
    block.replaceChildren(frame);
    button.addEventListener('click', () => load(true));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      load(false);
    }
  });
  observer.observe(block);
}
