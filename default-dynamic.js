function waitForElement(els, func, timeout = 100) {
    const queries = els.map(el => document.querySelector(el));
    if (queries.every(a => a)) {
        func(queries);
    } else if (timeout > 0) {
        setTimeout(waitForElement, 300, els, func, --timeout);
    }
}

function getAlbumInfo(uri) {
    return Spicetify.CosmosAsync.get(`hm://album/v1/album-app/album/${uri}/desktop`);
}

function isLight(hex) {
    var [r,g,b] = hexToRgb(hex).map(Number)
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000
    return brightness > 128
}

function hexToRgb(hex) {
    var bigint = parseInt(hex.replace("#",""), 16)
    var r = (bigint >> 16) & 255
    var g = (bigint >> 8) & 255
    var b = bigint & 255
    return [r, g, b]
}

function rgbToHex([r, g, b]) {
    const rgb = (r << 16) | (g << 8) | (b << 0);
    return '#' + (0x1000000 + rgb).toString(16).slice(1);
}

const LightenDarkenColor = (h, p) => '#' + [1, 3, 5].map(s => parseInt(h.substr(s, 2), 16)).map(c => parseInt((c * (100 + p)) / 100)).map(c => (c < 255 ? c : 255)).map(c => c.toString(16).padStart(2, '0')).join('');

function rgbToHsl([r, g, b]) {
  r /= 255, g /= 255, b /= 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;
  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb([h, s, l]) {
  var r, g, b;
  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [r * 255, g * 255, b * 255];
}

function setLightness(hex, lightness) {
    hsl = rgbToHsl(hexToRgb(hex))
    hsl[2] = lightness
    return rgbToHex(hslToRgb(hsl))
}

let nearArtistSpan = null
let mainColor = getComputedStyle(document.documentElement).getPropertyValue('--modspotify_main_fg')
let mainColorBg = getComputedStyle(document.documentElement).getPropertyValue('--modspotify_main_bg')

waitForElement([".main-trackInfo-artists"], (queries) => {
    nearArtistSpan = document.createElement("span")
    nearArtistSpan.id = "dribbblish-album-info"
    queries[0].append(nearArtistSpan)
});

function setRootColor(name, colHex) {
    let root = document.documentElement
    if (root===null) return
    root.style.setProperty('--modspotify_' + name, colHex)
    root.style.setProperty('--modspotify_rgb_' + name, hexToRgb(colHex).join(','))
}

function toggleDark(setDark) {
    if (setDark===undefined) setDark = isLight(mainColorBg)
    mainColorBg = setDark ? "#0A0A0A" : "#FAFAFA"

    setRootColor('main_bg', mainColorBg)
    setRootColor('secondary_fg', setDark ? "#F0F0F0" : "#3D3D3D")
    setRootColor('sidebar_and_player_bg', setDark ? "#0A0A0A" : "#FAFAFA")
    setRootColor('miscellaneous_bg', setDark ? "#6F6F6F" : "#3F3C45")
    setRootColor('miscellaneous_hover_bg', setDark ? "#303030" : "#DDDDDD")

    updateColors(mainColor)
}

/* Init with current system light/dark mode */
toggleDark(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--system_is_dark'))==1)

waitForElement([".main-topBar-indicators"], (queries) => {
    // Add activator on top bar
    const div = document.createElement("div")
    div.classList.add("main-topBarStatusIndicator-TopBarStatusIndicatorContainer")
    queries[0].append(div)

    const button = document.createElement("button")
    button.classList.add("main-topBarStatusIndicator-TopBarStatusIndicator", "main-topBarStatusIndicator-hasTooltip")
    button.setAttribute("title", "Light/Dark")
    button.onclick = () => { toggleDark(); };
    button.innerHTML = `<svg role="img" viewBox="0 0 16 16" height="16" width="16"><path fill="currentColor" d="M9.598 1.591a.75.75 0 01.785-.175 7 7 0 11-8.967 8.967.75.75 0 01.961-.96 5.5 5.5 0 007.046-7.046.75.75 0 01.175-.786zm1.616 1.945a7 7 0 01-7.678 7.678 5.5 5.5 0 107.678-7.678z"></path>
</svg>`
    div.append(button)
});

function updateColors(colHex) {
    let isLightBg = isLight(mainColorBg)
    if( isLightBg ) colHex = LightenDarkenColor(colHex, -15) // vibrant color is always too bright for white bg mode

    let darkerColHex = LightenDarkenColor(colHex, isLightBg ? 30 : -40)
    let sliderColHex = LightenDarkenColor(colHex, isLightBg ? 40 : -65)
    let buttonBgColHex = setLightness(colHex, isLightBg ? 0.90 : 0.08)

    document.documentElement.style.setProperty('--is_light', isLightBg ? 1 : 0)
    setRootColor('main_fg', colHex)
    setRootColor('active_control_fg', colHex)
    setRootColor('secondary_bg', colHex)
    setRootColor('pressing_button_bg', buttonBgColHex)
    setRootColor('indicator_fg_and_button_bg', darkerColHex)
    setRootColor('pressing_fg', colHex)
    setRootColor('sidebar_indicator_and_hover_button_bg', colHex)
    setRootColor('scrollbar_fg_and_selected_row_bg', buttonBgColHex)
    setRootColor('selected_button', darkerColHex)
    //setRootColor('miscellaneous_hover_bg', colHex)
    setRootColor('slider_bg', sliderColHex)

    // Also update the color of the icons for bright and white backgrounds to remain readable.
    let isLightFg = isLight(colHex)
    if( isLightBg ) isLightFg = !isLightFg
    iconCol = getComputedStyle(document.documentElement).getPropertyValue(isLightFg ? '--modspotify_main_bg' : '--modspotify_secondary_fg')
    setRootColor('preserve_1', iconCol)
}

async function songchange() {
    let album_uri = Spicetify.Player.data.track.metadata.album_uri

    if (album_uri!==undefined) {
        const albumInfo = await getAlbumInfo(album_uri.replace("spotify:album:", ""))

        let album_date = new Date(albumInfo.year, (albumInfo.month || 1)-1, albumInfo.day|| 0)
        let recent_date = new Date()
        recent_date.setMonth(recent_date.getMonth() - 6)
        album_date = album_date.toLocaleString('default', album_date>recent_date ? { year: 'numeric', month: 'short' } : { year: 'numeric' })
        album_link = "<a title=\""+Spicetify.Player.data.track.metadata.album_title+"\" href=\""+album_uri+"\" data-uri=\""+album_uri+"\" data-interaction-target=\"album-name\" class=\"tl-cell__content\">"+Spicetify.Player.data.track.metadata.album_title+"</a>"
        
        if (nearArtistSpan!==null)
            nearArtistSpan.innerHTML = " — " + album_link + " • " + album_date
        else
            setTimeout(songchange, 200)
    } else if (Spicetify.Player.data.track.metadata.album_track_number==0) {
        // podcast
        nearArtistSpan.innerText = Spicetify.Player.data.track.metadata.album_title
    } else if (Spicetify.Player.data.track.metadata.is_local=="true") {
        // local file
        nearArtistSpan.innerText = " — " + Spicetify.Player.data.track.metadata.album_title
    } else {
        // When clicking a song from the homepage, songChange is fired with half empty metadata
        // todo: retry only once?
        setTimeout(songchange, 200)
    }

    document.documentElement.style.setProperty('--image_url', 'url("'+Spicetify.Player.data.track.metadata.image_url+'")')

    Spicetify.colorExtractor(Spicetify.Player.data.track.uri)
        .then((colors) => {
            mainColor = colors['LIGHT_VIBRANT']

            // Spotify returns hex colors with improper length
            while( mainColor.length!=4 && mainColor.length<7 )
                { mainColor = mainColor.replace("#", "#0") }

            // main app
            updateColors(mainColor)

        }, (err) => {
            console.log(err)
            // On startup we receive songChange too soon and colorExtractor will fail
            // todo: retry only colorExtract
            setTimeout(songchange, 200)
        })
}

Spicetify.Player.addEventListener("songchange", songchange)