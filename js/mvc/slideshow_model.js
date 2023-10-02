let maxTags = 20000
let blacklistEnabled = true

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class SlideshowModel {
    constructor() {
        this.view = null;

        this.videoVolume = 0;
        this.videoMuted = false;

        this.searchText = "";

        this.sitesToSearch = {
            [SITE_ATFBOORU]: false,
            [SITE_DANBOORU]: false,
            [SITE_DERPIBOORU]: false,
            [SITE_E621]: false,
            [SITE_GELBOORU]: false,
            //[SITE_IBSEARCH]: false,
            [SITE_KONACHAN]: false,
            [SITE_REALBOORU]: false,
            [SITE_RULE34]: false,
            [SITE_PAHEAL]: false,
            [SITE_SAFEBOORU]: true,
            [SITE_XBOORU]: false,
            [SITE_YANDERE]: false
        };

        this.secondsPerSlide = 6;
        this.maxWidth = null;
        this.maxHeight = null;
        this.autoFitSlide = false;
        this.includeImages = true;
        this.includeGifs = true;
        this.includeWebms = false;
        this.includeExplicit = false
        this.includeQuestionable = false
        this.includeSafe = true
        this.includeFavorites = true
        this.hideBlacklist = false;
        this.blacklist = '';
        this.derpibooruApiKey = '';
        this.e621Login = ''
        this.e621ApiKey = ''
        this.gelbooruLogin = ''
        this.gelbooruApiKey = ''
        this.danbooruLogin = ''
        this.danbooruApiKey = ''
        this.storeHistory = true;
        this.searchHistory = [];
        this.groupedTags = []
        this.nonAPITags = []

        this.isPlaying = false;
        this.timer = null;
        this.timerMs = 0;

        this.slideshowPlaysFullVideo = false
        this.slideshowGifLoop = 4
        this.slideshowLowDurationMp4Seconds = 10

        this.sitesManager = null;

        this.personalList = new PersonalList();

        this.currentSlideChangedEvent = new Event(this);
        this.playingChangedEvent = new Event(this);
        this.videoVolumeUpdatedEvent = new Event(this);
        this.sitesToSearchUpdatedEvent = new Event(this);
        this.secondsPerSlideUpdatedEvent = new Event(this);
        this.maxWidthUpdatedEvent = new Event(this);
        this.maxHeightUpdatedEvent = new Event(this);
        this.autoFitSlideUpdatedEvent = new Event(this);
        this.includeImagesUpdatedEvent = new Event(this);
        this.includeGifsUpdatedEvent = new Event(this);
        this.includeWebmsUpdatedEvent = new Event(this);
        this.includeExplicitUpdatedEvent = new Event(this);
        this.includeQuestionableUpdatedEvent = new Event(this);
        this.includeSafeUpdatedEvent = new Event(this);
        this.hideBlacklistUpdatedEvent = new Event(this);
        this.blacklistUpdatedEvent = new Event(this);
        this.derpibooruApiKeyUpdatedEvent = new Event(this);
        this.e621LoginUpdatedEvent = new Event(this);
        this.e621ApiKeyUpdatedEvent = new Event(this);
        this.gelbooruLoginUpdatedEvent = new Event(this);
        this.gelbooruApiKeyUpdatedEvent = new Event(this);
        this.danbooruLoginUpdatedEvent = new Event(this);
        this.danbooruApiKeyUpdatedEvent = new Event(this);
        this.storeHistoryUpdatedEvent = new Event(this);
        this.searchHistoryUpdatedEvent = new Event(this);
        this.favoriteButtonUpdatedEvent = new Event(this);
        this.includeDupesUpdatedEvent = new Event(this);
        this.includeFavoritesUpdatedEvent = new Event(this)
        this.favoriteRemotelyUpdatedEvent = new Event(this)

        this.slideshowPlaysFullVideoUpdatedEvent = new Event(this)
        this.slideshowGifLoopUpdatedEvent = new Event(this)
        this.slideshowLowDurationMp4SecondsUpdatedEvent = new Event(this)

        this.seenList = null
        this.showSeen = false

        this.htmlParser = require("node-html-parser")
        this.cloudScraper = require("cloudscraper")

        this.dataLoader = new DataLoader(this);

        this.initialize();

        let _this = this
        this.currentSlideChangedEvent.attach(function () {
            if (_this.seenList != null) {
                if (_this.getCurrentSlide()) {
                    if (!_this.seenList.seenList.includes(_this.getCurrentSlide().md5)) {
                        _this.seenList.seenList.push(_this.getCurrentSlide().md5)
                        _this.dataLoader.saveSeenList(_this.seenList)
                    }
                }

            }
            else {
                _this.seenList = { max: 1000000, seenList: [] }
            }
        })
    }

    initialize() {
        var numberOfSlidesToAlwaysHaveReadyToDisplay = 20;
        var maxNumberOfThumbnails = 10;

        this.sitesManager = new SitesManager(this, numberOfSlidesToAlwaysHaveReadyToDisplay, maxNumberOfThumbnails);

        var pageLimit = 100;

        this.sitesManager.addSite(SITE_ATFBOORU, pageLimit);
        this.sitesManager.addSite(SITE_DANBOORU, pageLimit);
        this.sitesManager.addSite(SITE_DERPIBOORU, 10);
        this.sitesManager.addSite(SITE_E621, pageLimit);
        this.sitesManager.addSite(SITE_GELBOORU, pageLimit);
        //this.sitesManager.addSite(SITE_IBSEARCH, pageLimit);
        this.sitesManager.addSite(SITE_KONACHAN, pageLimit);
        this.sitesManager.addSite(SITE_REALBOORU, pageLimit);
        this.sitesManager.addSite(SITE_RULE34, pageLimit);
        this.sitesManager.addSite(SITE_PAHEAL, pageLimit);
        this.sitesManager.addSite(SITE_SAFEBOORU, pageLimit);
        this.sitesManager.addSite(SITE_XBOORU, pageLimit);
        this.sitesManager.addSite(SITE_YANDERE, pageLimit);
    }

    loadUserSettings() {
        this.dataLoader.loadUserSettings();
    }

    pingSites() {
        var _this = this;
        this.sitesManager.pingSites(function (siteManager) {
            // console.log(siteManager)
            if (!siteManager.isOnline)
                _this.view.showSiteOffline(siteManager.id);
        });
    }

    performSearch(searchText, originalText) {
        this.sitesManager.resetConnections();

        var selectedSites = this.getSelectedSitesToSearch();
        this.sitesManager.enableSites(selectedSites);

        var _this = this;

        this.sitesManager.performSearch(searchText, function () {
            _this.view.clearInfoMessage();
            _this.currentSlideChangedEvent.notify();
        });

        this.storeSearchHistory(originalText);
    }

    storeSearchHistory(searchText) {
        // console.log(searchText)
        if (!this.storeHistory)
            return;

        if (searchText == null || searchText.length == 0)
            return;

        if (this.searchHistory.includes(searchText)) {
            var index = this.searchHistory.indexOf(searchText)

            if (index == 0)
                return;

            this.searchHistory.splice(index, 1);
            this.searchHistory.unshift(searchText);
        }
        else {
            this.searchHistory.unshift(searchText);
            this.searchHistory = this.searchHistory.slice(0, 100);
        }

        this.dataLoader.saveSearchHistory();

        this.searchHistoryUpdatedEvent.notify();
    }

    areSomeTagsAreBlacklisted(tags) {
        var postTags = tags.split(" ")
        let groups = [{ normal: [], or: [] }]
        var tokenized = this.blacklist.trim().replace(/(\r\n|\n|\r)/gm, " ").split("");

        if (postTags.length == 0 || tokenized.length == 0)
            return false;

        let getNextToken = function (index) {
            if (index >= tokenized.length) return null;
            let token = ""
            for (let i = index + 1; i < tokenized.length; i++) {
                let t = tokenized[i]
                if (t == " ") {
                    return token
                } else {
                    token += t
                }
            }
        }

        let skip = [")", "~"]
        let inGroup = false
        let nextOr = false

        let token = ""
        for (let i = 0; i < tokenized.length; i++) {
            let t = tokenized[i]
            if (t == " ") {
                if (token == "(") {
                    inGroup = true
                    groups.push({ normal: [], or: [] })
                } else if (token == ")") {
                    inGroup = false
                }
                else if (!skip.includes(token)) {
                    if (nextOr) {
                        groups[inGroup ? groups.length - 1 : 0].or.push(token)
                        if (getNextToken(i) != "~") {
                            nextOr = false
                        }
                    } else if (getNextToken(i) == "~") {
                        nextOr = true
                        groups[inGroup ? groups.length - 1 : 0].or.push(token)
                    } else {
                        groups[inGroup ? groups.length - 1 : 0].normal.push(token)
                    }
                }
                token = ""
            }
            else {
                token += t
            }
        }

        if (token.length > 0 && !skip.includes(token)) {
            groups[inGroup ? groups.length - 1 : 0].normal.push(token)
        }

        for (let tag of groups[0].normal) {
            if (!tag.startsWith("-")) {
                if (postTags.includes(tag)) return true
            } else {
                if (!postTags.includes(tag.slice(1))) return true
            }
        }

        for (let i = 1; i < groups.length; i++) {
            if (groups[i].normal.length > 0) {
                let hasAll = true

                for (let tag of groups[i].normal) {
                    if (!tag.startsWith("-")) {
                        if (!postTags.includes(tag)) {
                            hasAll = false
                            break
                        }
                    } else {
                        if (postTags.includes(tag.slice(1))) {
                            hasAll = false
                            break
                        }
                    }
                }

                if (hasAll)
                    return true
            }

            if (groups[i].or.length > 0) {
                let hasAny = false

                for (let tag of groups[i].or) {
                    if (!tag.startsWith("-")) {
                        if (!postTags.includes(tag)) {
                            hasAny = true
                            break
                        }
                    } else {
                        if (postTags.includes(tag.slice(1))) {
                            hasAny = true
                            break
                        }
                    }
                }

                if (!hasAny)
                    return true
            }
        }

        return false;
    }

    setSlideNumberToFirst() {
        this.sitesManager.moveToFirstSlide();
        this.currentSlideChangedEvent.notify();

        this.restartSlideshowIfOn();
    }

    decreaseCurrentSlideNumber() {
        if (!this.sitesManager.canDecreaseCurrentSlideNumber()) {
            return;
        }

        this.sitesManager.decreaseCurrentSlideNumber();
        this.currentSlideChangedEvent.notify();

        this.restartSlideshowIfOn();
    }

    increaseCurrentSlideNumber() {
        var _this = this;

        this.sitesManager.increaseCurrentSlideNumber(function () {
            _this.currentSlideChangedEvent.notify();
        });

        this.restartSlideshowIfOn();
    }

    decreaseCurrentSlideNumberByTen() {
        if (!this.sitesManager.canDecreaseCurrentSlideNumber()) {
            return;
        }

        this.sitesManager.decreaseCurrentSlideNumberByTen();
        this.currentSlideChangedEvent.notify();

        this.restartSlideshowIfOn();
    }

    increaseCurrentSlideNumberByTen() {
        var _this = this;

        this.sitesManager.increaseCurrentSlideNumberByTen(function () {
            _this.currentSlideChangedEvent.notify();
        });

        this.restartSlideshowIfOn();
    }

    setSlideNumberToLast() {
        var _this = this;

        this.sitesManager.moveToLastSlide(function () {
            _this.currentSlideChangedEvent.notify();
        });

        this.restartSlideshowIfOn();
    }

    moveToSlide(id) {
        if (this.sitesManager.moveToSlide(id)) {
            this.currentSlideChangedEvent.notify();
            //restartSlideshowIfOn();
        }
    }

    preloadNextUnpreloadedSlideAfterThisOneIfInRange(slide) {
        this.sitesManager.preloadNextUnpreloadedSlideAfterThisOneIfInRange(slide);
    }

    tryToPlayOrPause() {
        if (this.hasSlidesToDisplay()) {
            if (this.isPlaying)
                this.pauseSlideshow();
            else
                this.startSlideshow();
        }
    }

    startSlideshow() {
        this.tryToStartCountdown();

        this.isPlaying = true;

        this.playingChangedEvent.notify();
    }

    tryToStartCountdown() {
        if (this.sitesManager.isCurrentSlideLoaded()) {
            this.startCountdown();
        }
        else {
            var _this = this;

            this.sitesManager.runCodeWhenCurrentSlideFinishesLoading(function () {
                _this.startCountdown();
            });
        }
    }

    async startCountdown() {
        var millisecondsPerSlide = this.secondsPerSlide * 1000;

        if (this.slideshowPlaysFullVideo) {
            var slide = this.getCurrentSlide();
            if (slide.mediaType == MEDIA_TYPE_GIF) {
                var buffer = await getBufferFromUrl(slide.fileUrl)
                var frames = await gifFrames({ url: buffer, frames: "all", outputType: "png" })
                let duration = 0
                for (let frame of frames) {
                    duration += frame.frameInfo.delay
                }
                millisecondsPerSlide = duration * 10

                if (millisecondsPerSlide < this.slideshowLowDurationMp4Seconds * 1000) {
                    millisecondsPerSlide = duration * 10 * this.slideshowGifLoop;

                    while (millisecondsPerSlide < this.secondsPerSlide * 1000) {
                        millisecondsPerSlide += duration * 10;
                    }
                }

            } else if (slide.mediaType == MEDIA_TYPE_VIDEO) {
                if (this.view.uiElements.currentVideo.readyState === 4) {
                    millisecondsPerSlide = this.view.uiElements.currentVideo.duration * 1000;
                } else {
                    await new Promise(resolve => {
                        this.view.uiElements.currentVideo.onloadeddata = () => {
                            resolve();
                        }
                    })

                    millisecondsPerSlide = this.view.uiElements.currentVideo.duration * 1000;
                }

                if (millisecondsPerSlide < this.slideshowLowDurationMp4Seconds * 1000) {
                    millisecondsPerSlide = this.view.uiElements.currentVideo.duration * this.slideshowGifLoop * 1000;
                    while (millisecondsPerSlide < this.secondsPerSlide * 1000) {
                        millisecondsPerSlide += this.view.uiElements.currentVideo.duration * 1000;
                    }
                }
            }
        }

        var _this = this;

        this.timer = setTimeout(function () {
            if (_this.hasNextSlide()) {
                // Continue slideshow
                _this.increaseCurrentSlideNumber();
            }
            else {
                // Loop when out of images/videos
                _this.setSlideNumberToFirst();
            }

        }, millisecondsPerSlide);
    }

    restartSlideshowIfOn() {

        if (this.isPlaying) {
            clearTimeout(this.timer);
            this.sitesManager.clearCallbacksForPreloadingSlides();

            this.tryToStartCountdown();
        }
    }

    pauseSlideshow() {
        clearTimeout(this.timer);
        this.sitesManager.clearCallbacksForPreloadingSlides();
        this.sitesManager.clearCallbacksForLoadingSlides();

        this.isPlaying = false;

        this.playingChangedEvent.notify();
    }

    hasAtLeastOneOnlineSiteSelected() {
        this.sitesManager.resetConnections();

        var selectedSites = this.getSelectedSitesToSearch();
        this.sitesManager.enableSites(selectedSites);

        return this.sitesManager.hasAtLeastOneOnlineSiteSelected();
    }

    getSlideCount() {
        return this.sitesManager.getTotalSlideNumber();
    }

    hasSlidesToDisplay() {
        return (this.getSlideCount() > 0);
    }

    hasNextSlide() {
        return (this.getSlideCount() > this.getCurrentSlideNumber());
    }

    isTryingToLoadMoreSlides() {
        return this.sitesManager.isTryingToLoadMoreSlides;
    }

    getCurrentSlide() {
        return this.sitesManager.getCurrentSlide();
    }

    getCurrentSlideNumber() {
        return this.sitesManager.currentSlideNumber;
    }

    areThereMoreLoadableSlides() {
        return this.sitesManager.areThereMoreLoadableSlides();
    }

    getNextSlidesForThumbnails() {
        return this.sitesManager.getNextSlidesForThumbnails();
    }

    getSelectedSitesToSearch() {
        var selectedSitesToSearch = [];

        for (var siteToSearch in this.sitesToSearch) {
            if (this.sitesToSearch[siteToSearch]) {
                selectedSitesToSearch.push(siteToSearch);
            }
        }

        return selectedSitesToSearch;
    }

    areMaxWithAndHeightEnabled() {
        return !this.autoFitSlide;
    }

    setVideoVolume(volume) {
        this.videoVolume = volume;

        this.dataLoader.saveVideoVolume();

        this.videoVolumeUpdatedEvent.notify();
    }

    setVideoMuted(muted) {
        this.videoMuted = muted;

        this.dataLoader.saveVideoMuted();

        this.videoVolumeUpdatedEvent.notify();
    }

    setSitesToSearch(sitesToSearch) {
        this.sitesToSearch = sitesToSearch;

        this.dataLoader.saveSitesToSearch();

        this.sitesToSearchUpdatedEvent.notify();
    }

    setSiteToSearch(site, checked) {
        this.sitesToSearch[site] = checked;

        this.dataLoader.saveSitesToSearch();

        this.sitesToSearchUpdatedEvent.notify();
    }

    setSecondsPerSlide(secondsPerSlide) {
        this.secondsPerSlide = secondsPerSlide;

        this.dataLoader.saveSecondsPerSlide();

        this.secondsPerSlideUpdatedEvent.notify();
    }

    setSecondsPerSlideIfValid(secondsPerSlide) {
        if (secondsPerSlide == '')
            return;

        if (isNaN(secondsPerSlide))
            return;

        if (secondsPerSlide < 1)
            return;

        this.setSecondsPerSlide(secondsPerSlide);
    }

    setMaxWidth(maxWidth) {
        this.maxWidth = maxWidth;

        this.dataLoader.saveMaxWidth();

        this.maxWidthUpdatedEvent.notify();
    }

    setMaxHeight(maxHeight) {
        this.maxHeight = maxHeight;

        this.dataLoader.saveMaxHeight();

        this.maxHeightUpdatedEvent.notify();
    }

    setAutoFitSlide(onOrOff) {
        this.autoFitSlide = onOrOff;

        this.dataLoader.saveAutoFitSlide();

        this.autoFitSlideUpdatedEvent.notify();
    }

    setIncludeImages(onOrOff) {
        this.includeImages = onOrOff;

        this.dataLoader.saveIncludeImages();

        this.includeImagesUpdatedEvent.notify();
    }

    setIncludeGifs(onOrOff) {
        this.includeGifs = onOrOff;

        this.dataLoader.saveIncludeGifs();

        this.includeGifsUpdatedEvent.notify();
    }

    setIncludeWebms(onOrOff) {
        this.includeWebms = onOrOff;

        this.dataLoader.saveIncludeWebms();

        this.includeWebmsUpdatedEvent.notify();
    }

    setIncludeExplicit(onOrOff) {
        this.includeExplicit = onOrOff;

        this.dataLoader.saveIncludeExplicit();

        this.includeExplicitUpdatedEvent.notify();
    }

    setIncludeQuestionable(onOrOff) {
        this.includeQuestionable = onOrOff;

        this.dataLoader.saveIncludeQuestionable();

        this.includeQuestionableUpdatedEvent.notify();
    }

    setIncludeSafe(onOrOff) {
        this.includeSafe = onOrOff;

        this.dataLoader.saveIncludeSafe();

        this.includeSafeUpdatedEvent.notify();
    }

    setIncludeFavorites(onOrOff) {
        // console.log("saved")
        this.includeFavorites = onOrOff;

        this.dataLoader.saveIncludeFavorites();

        this.includeFavoritesUpdatedEvent.notify();
    }

    setFavoriteRemotely(onOrOff) {
        this.favoriteRemotely = onOrOff;

        this.dataLoader.saveFavoriteRemotely();

        this.favoriteRemotelyUpdatedEvent.notify();
    }

    setSlideshowPlaysFullVideo(onOrOff) {
        this.slideshowPlaysFullVideo = onOrOff;

        this.dataLoader.saveSlideshowPlaysFullVideo();

        this.slideshowPlaysFullVideoUpdatedEvent.notify();
    }

    setSlideshowGifLoop(num) {
        this.slideshowGifLoop = num;

        this.dataLoader.saveSlideshowGifLoop();

        this.slideshowGifLoopUpdatedEvent.notify();
    }

    setSlideshowLowDurationMp4Seconds(num) {
        this.slideshowLowDurationMp4Seconds = num;

        this.dataLoader.saveSlideshowLowDurationMp4Seconds();

        this.slideshowLowDurationMp4SecondsUpdatedEvent.notify();
    }

    setIncludeDupes(onOrOff) {
        this.includeDupes = onOrOff;

        this.dataLoader.saveIncludeDupes();

        this.includeDupesUpdatedEvent.notify();
    }

    setHideBlacklist(onOrOff) {
        this.hideBlacklist = onOrOff;

        this.dataLoader.saveHideBlacklist();

        this.hideBlacklistUpdatedEvent.notify();
    }

    setBlacklist(blacklist) {
        this.blacklist = blacklist;

        this.dataLoader.saveBlacklist();

        this.blacklistUpdatedEvent.notify();
    }

    setDerpibooruApiKey(derpibooruApiKey) {
        this.derpibooruApiKey = derpibooruApiKey;

        this.dataLoader.saveDerpibooruApiKey();

        this.derpibooruApiKeyUpdatedEvent.notify();
    }

    setE621ApiKey(e621ApiKey) {
        this.e621ApiKey = e621ApiKey;

        this.dataLoader.saveE621ApiKey();

        this.e621ApiKeyUpdatedEvent.notify();
    }

    setE621Login(e621Login) {
        this.e621Login = e621Login;

        this.dataLoader.saveE621Login();

        this.e621LoginUpdatedEvent.notify();
    }

    setGelbooruApiKey(gelbooruApiKey) {
        this.gelbooruApiKey = gelbooruApiKey;

        this.dataLoader.saveGelbooruApiKey();

        this.gelbooruApiKeyUpdatedEvent.notify();
    }

    setGelbooruLogin(gelbooruLogin) {
        this.gelbooruLogin = gelbooruLogin;

        this.dataLoader.saveGelbooruLogin();

        this.gelbooruLoginUpdatedEvent.notify();
    }

    setDanbooruApiKey(danbooruApiKey) {
        this.danbooruApiKey = danbooruApiKey;

        this.dataLoader.saveDanbooruApiKey();

        this.danbooruApiKeyUpdatedEvent.notify();
    }

    setDanbooruLogin(danbooruLogin) {
        this.danbooruLogin = danbooruLogin;

        this.dataLoader.saveDanbooruLogin();

        this.danbooruLoginUpdatedEvent.notify();
    }

    setStoreHistory(onOrOff) {
        this.storeHistory = onOrOff;

        this.dataLoader.saveStoreHistory();

        this.storeHistoryUpdatedEvent.notify();
    }

    setSearchHistory(searchHistory) {
        this.searchHistory = searchHistory;

        this.dataLoader.saveSearchHistory();

        this.searchHistoryUpdatedEvent.notify();
    }

    setPersonalList(personalList) {
        this.personalList = personalList;

        this.dataLoader.savePersonalList();
    }

    toggleSlideFave() {
        let currentSlide = this.getCurrentSlide();

        if (currentSlide == null)
            return;

        if (this.isCurrentSlideFaved()) {
            this.personalList.tryToRemove(currentSlide);
            if (this.view != null && this.view.getFavoriteRemotely()) {
                if (currentSlide.siteId == SITE_E621) {
                    this.sitesManager.siteManagers.find(sm => sm.id == SITE_E621).favorite(false, currentSlide.id)
                }
            }
        }
        else {
            this.personalList.tryToAdd(currentSlide);
            if (this.view != null && this.view.getFavoriteRemotely()) {
                if (currentSlide.siteId == SITE_E621) {
                    this.sitesManager.siteManagers.find(sm => sm.id == SITE_E621).favorite(true, currentSlide.id)
                }
            }
        }

        // console.log("Added")
        this.dataLoader.savePersonalList();
        this.favoriteButtonUpdatedEvent.notify();
    }

    isCurrentSlideFaved() {
        let currentSlide = this.getCurrentSlide();
        // console.log(currentSlide)

        if (currentSlide == null)
            return false;

        // console.log("current slide md5 = " + currentSlide.md5);
        return this.personalList.contains(currentSlide);
    }

    toggleTags() {
        this.view.toggleTags()
    }

    addArtistsToSearch(artistsArr) {
        let match = this.view.uiElements.searchTextBox.value.match(/\(.*\)/)
        let numTags = 0
        if (match) {
            numTags += match[0].trim().split(" ~ ").length
            numTags += this.view.uiElements.searchTextBox.value.slice(0, match.index - 1).trim().split(" ").length
        } else {
            numTags += this.view.uiElements.searchTextBox.value.trim().split(" ").length
        }
        let currentSlide = this.getCurrentSlide();
        if (!artistsArr && (!currentSlide.rawTags || !currentSlide.rawTags.artist)) {
            if (currentSlide.siteId == SITE_RULE34 || currentSlide.siteId == SITE_XBOORU || currentSlide.siteId == SITE_KONACHAN || currentSlide.siteId == SITE_XBOORU) {
                var _this = this
                this.cloudScraper.get(currentSlide.viewableWebsitePostUrl).then((html) => {
                    let parsed = this.htmlParser.parse(html)
                    let artists = []
                    for (let element of parsed.querySelectorAll(".tag-type-artist")) {
                        for (let possibility of element.querySelectorAll("a")) {
                            if (possibility.structuredText.trim() != "?") {
                                artists.push(possibility.structuredText.trim())
                                break
                            }
                        }

                    }
                    _this.addArtistsToSearch(artists)
                }, console.error)
            } else if (currentSlide.siteId == SITE_REALBOORU) {
                var _this = this
                this.cloudScraper.get(currentSlide.viewableWebsitePostUrl).then((html) => {
                    let parsed = this.htmlParser.parse(html)
                    let artists = []
                    for (let element of parsed.querySelectorAll(".model")) {
                        artists.push(element.structuredText.trim())
                    }
                    _this.addArtistsToSearch(artists)
                }, console.error)
            }
            return;
        }
        // if (artistsArr.length == 0) return;
        if (artistsArr) {
            currentSlide.rawTags = { artist: artistsArr }
        }
        // console.log(numTags)
        let artists = "";
        let notNormal = this.view.uiElements.searchTextBox.value[this.view.uiElements.searchTextBox.value.length - 1] != ")"
        if (this.view.uiElements.searchTextBox.value[this.view.uiElements.searchTextBox.value.length - 1] == ")") this.view.uiElements.searchTextBox.value = this.view.uiElements.searchTextBox.value.substring(0, this.view.uiElements.searchTextBox.value.length - 1)
        for (let artist of currentSlide.rawTags.artist) {
            if (artist == "unknown_artist" || artist == "anonymous_artist" || artist == "conditional_dnp" || artist == "sound_warning" || this.view.uiElements.searchTextBox.value.includes(artist.split(" ").join("_")))
                continue;
            if (numTags >= maxTags - 1) {
                this.view.displayInfoMessage("Max tags reached")
                setTimeout(() => {
                    this.view.clearInfoMessage()
                }, 5000);
                break
            }
            if (notNormal) {
                artists += `( ${artist.split(" ").join("_")} `;
                notNormal = false
            } else {
                artists += `~ ${artist.split(" ").join("_")} `;
            }
            numTags++
        }
        artists += ")"
        if (numTags >= maxTags) {
            this.view.displayInfoMessage(`${maxTags} tags reached`)
            setTimeout(() => {
                this.view.clearInfoMessage()
            }, 5000);
        }
        this.view.uiElements.searchTextBox.value += artists
    }
}
