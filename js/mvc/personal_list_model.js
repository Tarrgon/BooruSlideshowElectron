class PersonalListModel {
    constructor() {
        this.view = null;

        this.loadedSlides = []

        this.videoVolume = 0;
        this.videoMuted = false;

        this.filterText = "";

        this.secondsPerSlide = 6;
        this.maxWidth = null;
        this.maxHeight = null;
        this.autoFitSlide = false;

        this.isPlaying = false;
        this.timer = null;
        this.timerMs = 0;

        this.sitesManager = new SitesManager(this, 20, 10)
        this.cachedSiteManagers = []

        this.dataLoader = new DataLoader(this);

        this.personalList = new PersonalList([], this.dataLoader, this);
        this.filtered = false
        this.filteredPersonalList = null

        this.currentSlideChangedEvent = new Event(this);
        this.playingChangedEvent = new Event(this);
        this.videoVolumeUpdatedEvent = new Event(this);
        this.secondsPerSlideUpdatedEvent = new Event(this);
        this.maxWidthUpdatedEvent = new Event(this);
        this.maxHeightUpdatedEvent = new Event(this);
        this.autoFitSlideUpdatedEvent = new Event(this);
        this.personalListLoadedEvent = new Event(this);


        this.currentListItem = 0;

        this.initialize();
    }

    initialize() {
        var numberOfSlidesToAlwaysHaveReadyToDisplay = 20;
        var maxNumberOfThumbnails = 10;

        /*this.sitesManager = new SitesManager(this, numberOfSlidesToAlwaysHaveReadyToDisplay, maxNumberOfThumbnails);
    	
        var pageLimit = 100;
    	
        this.sitesManager.addSite(SITE_ATFBOORU, pageLimit);
        this.sitesManager.addSite(SITE_DANBOORU, pageLimit);
        this.sitesManager.addSite(SITE_DERPIBOORU, 10);
        this.sitesManager.addSite(SITE_E621, pageLimit);
        this.sitesManager.addSite(SITE_GELBOORU, pageLimit);
        this.sitesManager.addSite(SITE_KONACHAN, pageLimit);
        this.sitesManager.addSite(SITE_REALBOORU, pageLimit);
        this.sitesManager.addSite(SITE_RULE34, pageLimit);
        this.sitesManager.addSite(SITE_SAFEBOORU, pageLimit);
        this.sitesManager.addSite(SITE_XBOORU, pageLimit);
        this.sitesManager.addSite(SITE_YANDERE, pageLimit);*/
    }

    loadUserSettings() {
        this.dataLoader.loadUserSettings();
    }

    _min(d0, d1, d2, bx, ay) {
        return d0 < d1 || d2 < d1
            ? d0 > d2
                ? d2 + 1
                : d0 + 1
            : bx === ay
                ? d1
                : d1 + 1;
    }

    levenshtein(a, b) {
        if (a === b) {
            return 0;
        }

        if (a.length > b.length) {
            var tmp = a;
            a = b;
            b = tmp;
        }

        var la = a.length;
        var lb = b.length;

        while (la > 0 && (a.charCodeAt(la - 1) === b.charCodeAt(lb - 1))) {
            la--;
            lb--;
        }

        var offset = 0;

        while (offset < la && (a.charCodeAt(offset) === b.charCodeAt(offset))) {
            offset++;
        }

        la -= offset;
        lb -= offset;

        if (la === 0 || lb < 3) {
            return lb;
        }

        var x = 0;
        var y;
        var d0;
        var d1;
        var d2;
        var d3;
        var dd;
        var dy;
        var ay;
        var bx0;
        var bx1;
        var bx2;
        var bx3;

        var vector = [];

        for (y = 0; y < la; y++) {
            vector.push(y + 1);
            vector.push(a.charCodeAt(offset + y));
        }

        var len = vector.length - 1;

        for (; x < lb - 3;) {
            bx0 = b.charCodeAt(offset + (d0 = x));
            bx1 = b.charCodeAt(offset + (d1 = x + 1));
            bx2 = b.charCodeAt(offset + (d2 = x + 2));
            bx3 = b.charCodeAt(offset + (d3 = x + 3));
            dd = (x += 4);
            for (y = 0; y < len; y += 2) {
                dy = vector[y];
                ay = vector[y + 1];
                d0 = this._min(dy, d0, d1, bx0, ay);
                d1 = this._min(d0, d1, d2, bx1, ay);
                d2 = this._min(d1, d2, d3, bx2, ay);
                dd = this._min(d2, d3, dd, bx3, ay);
                vector[y] = dd;
                d3 = d2;
                d2 = d1;
                d1 = d0;
                d0 = dy;
            }
        }

        for (; x < lb;) {
            bx0 = b.charCodeAt(offset + (d0 = x));
            dd = ++x;
            for (y = 0; y < len; y += 2) {
                dy = vector[y];
                vector[y] = dd = this._min(dy, d0, dd, bx0, vector[y + 1]);
                d0 = dy;
            }
        }

        return dd;
    }

    tagsPass(tags, singleTag, negate = false, fuzzy = false) {
        if (!tags || !singleTag) return false;

        let result = false
        for (let tag of tags) {
            if (fuzzy) {
                if (this.levenshtein(singleTag, tag) <= 2) {
                    result = true
                    break;
                }
            }
            else {
                if (singleTag.includes("*"))
                {
                    let regex = new RegExp(singleTag.replace("*", ".*"))
                    if (tag.match(regex)) {
                        result = true
                        break
                    }
                }else if (tag == singleTag) {
                    result = true
                    break;
                }
            }
        }


        return negate ? !result : result;
    }

    passesGroup(item, group)
    {
        let passesAnd = true
        for (let tag of group.and)
        {
            let fuzzy = tag.endsWith("~")
            if (!this.tagsPass(item.tags.split(" "), fuzzy ? tag.substring(0, tag.length - 1) : tag, false, fuzzy)) {
                passesAnd = false
                break
            }
        }

        let passesNot = true
        for (let tag of group.not)
        {
            let fuzzy = tag.endsWith("~")
            if (!this.tagsPass(item.tags.split(" "), fuzzy ? tag.substring(0, tag.length - 1) : tag, true, fuzzy)) {
                passesNot = false
                break
            }
        }
        
        let passesOr = false
        for (let tag of group.or)
        {
            let fuzzy = tag.endsWith("~")
            if (this.tagsPass(item.tags.split(" "), fuzzy ? tag.substring(0, tag.length - 1) : tag, false, fuzzy))
            {
                passesOr = true
                break
            }
        }

        return (group.or.length == 0 || passesOr) && passesAnd && passesNot
    }

    performFilter(filterText) {
        //this.sitesManager.resetConnections();
        let sites = filterText.match(/-?SITE_\w+/gm)
        filterText = filterText.replace(/\s?-?SITE_\w+\s?/gm, "")

        let groups = [
            {
                or: [],
                and: [],
                not: []
            }
        ] // has to pass all groups
        // group structure:
        /**  
        {
            or: [[tag1, tag2], [tag3, tag4], [tag5]] // has to pass one of the groups
            and: [tag1, tag2, tag3]
            not: [tag1, tag2, tag3]]
        }
        */

        let tokenized = filterText.split("")

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

        let skip = ["~", ")"]
        let inGroup = false
        let nextOr = false
        let token = ""
        for (let i = 0; i < tokenized.length; i++) {
            let t = tokenized[i]
            if (t == " ") {
                if (token == "(") {
                    inGroup = true
                    groups.push({
                        or: [],
                        and: [],
                        not: []
                    })
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
                    } else if (token.startsWith("-")) {
                        groups[inGroup ? groups.length - 1 : 0].not.push(token.substring(1))
                    }
                    else {
                        groups[inGroup ? groups.length - 1 : 0].and.push(token)
                    }
                }
                token = ""
            }
            else {
                token += t
            }
        }

        if (!skip.includes(token)) {
            if (nextOr) {
                groups[inGroup ? groups.length - 1 : 0].or.push(token.substring(1))
            } else if (token.startsWith("-")) {
                groups[inGroup ? groups.length - 1 : 0].not.push(token.substring(1))
            }
            else {
                groups[inGroup ? groups.length - 1 : 0].and.push(token)
            }
        }

        this.filtered = true

        var items = this.personalList.personalListItems.filter((item) => {
            if (!item.tags || item.tags == "" || typeof item.tags != "string") return false
            if (sites) {
                let passSite = false
                for (let site of sites) {
                    if (site.startsWith("-") && item.siteId == site.slice(6)) return false
                    else if (item.siteId == site.slice(5)) {
                        passSite = true
                        break
                    }
                }
                if (!passSite) return false
            }

            for (let group of groups) {
                if (!this.passesGroup(item, group)) return false
            }

            return true
        })

        this.filteredPersonalList = new PersonalList(items, this.dataLoader, this)
        this.currentListItem = 1
        this.currentSlideChangedEvent.notify()
        // console.log(this.filteredPersonalList)

        /*this.sitesManager.performFilter(filterText, function () {
            _this.view.clearInfoMessage();
            _this.currentSlideChangedEvent.notify();
        });*/
    }

    setSlideNumberToFirst() {
        if (this.currentListItem != 1) {
            this.currentListItem = 1;
            this.currentSlideChangedEvent.notify();
            this.restartSlideshowIfOn();
        }
    }

    decreaseCurrentSlideNumber() {
        if (this.currentListItem > 1) {
            this.currentListItem--;
            this.currentSlideChangedEvent.notify();
            this.restartSlideshowIfOn();
        }
        if (this.getCurrentSlide().bad) {
            this.decreaseCurrentSlideNumber()
        }
    }

    increaseCurrentSlideNumber() {
        if (!this.filtered) {
            if (this.currentListItem < this.personalList.count()) {
                this.currentListItem++;
                this.currentSlideChangedEvent.notify();
                this.restartSlideshowIfOn();
            }
        }
        else {
            if (this.currentListItem < this.filteredPersonalList.count()) {
                this.currentListItem++;
                this.currentSlideChangedEvent.notify();
                this.restartSlideshowIfOn();
            }
        }
        if (this.getCurrentSlide().bad) {
            this.increaseCurrentSlideNumber()
        }
    }

    decreaseCurrentSlideNumberByTen() {
        if (this.currentListItem > 1) {
            this.currentListItem -= 10;

            if (this.currentListItem < 1)
                this.currentListItem = 1;

            this.currentSlideChangedEvent.notify();
            this.restartSlideshowIfOn();
        }
    }

    increaseCurrentSlideNumberByTen() {
        if (!this.filtered) {
            if (this.currentListItem < this.personalList.count()) {
                this.currentListItem += 10;

                if (this.currentListItem > this.personalList.count())
                    this.currentListItem = this.personalList.count();

                this.currentSlideChangedEvent.notify();
                this.restartSlideshowIfOn();
            }
        } else {
            if (this.currentListItem < this.filteredPersonalList.count()) {
                this.currentListItem += 10;

                if (this.currentListItem > this.filteredPersonalList.count())
                    this.currentListItem = this.filteredPersonalList.count();

                this.currentSlideChangedEvent.notify();
                this.restartSlideshowIfOn();
            }
        }
    }

    setSlideNumberToLast() {
        if (!this.filtered) {
            if (this.currentListItem != this.personalList.count()) {
                this.currentListItem = this.personalList.count();
                this.currentSlideChangedEvent.notify();
                this.restartSlideshowIfOn();
            }
        } else {
            if (this.currentListItem != this.filteredPersonalList.count()) {
                this.currentListItem = this.filteredPersonalList.count();
                this.currentSlideChangedEvent.notify();
                this.restartSlideshowIfOn();
            }
        }
    }

    moveToSlide(id) {
        var index = this.filtered ? this.filteredPersonalList.getIndexById(id) : this.personalList.getIndexById(id);

        if (index > -1) {
            this.currentListItem = index + 1;
            this.currentSlideChangedEvent.notify();
        }
    }

    tryToPlayOrPause() {
        if (this.hasPersonalListItems()) {
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
        this.startCountdown()
        /*if (this.sitesManager.isCurrentSlideLoaded())
        {
            this.startCountdown();
        }
        else
        {
            var _this = this;

            this.sitesManager.runCodeWhenCurrentSlideFinishesLoading(function(){
                _this.startCountdown();
            });
        }*/
    }

    startCountdown() {
        var millisecondsPerSlide = this.secondsPerSlide * 1000;

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
            this.clearCallbacksForPreloadingSlides();

            this.tryToStartCountdown();
        }
    }

    clearCallbacksForPreloadingSlides() {
        if (this.currentListItem > 0) {
            var currentSlide = this.getCurrentSlide();
            currentSlide.clearCallback();
        }
    }

    pauseSlideshow() {
        clearTimeout(this.timer);
        this.clearCallbacksForPreloadingSlides();

        this.isPlaying = false;

        this.playingChangedEvent.notify();
    }

    getPersonalListItemCount() {
        return this.filtered ? this.filteredPersonalList.count() : this.personalList.count();
    }

    hasPersonalListItems() {
        return (this.filtered ? this.filteredPersonalList.count() : this.personalList.count() > 0);
    }

    hasNextSlide() {
        return (this.filtered ? this.filteredPersonalList.count() : this.personalList.count() > this.getCurrentSlideNumber());
    }

    getCurrentSlide() {
        if (this.currentListItem == 0)
            return null;
        let loadedSlide = this.loadedSlides.find(t => t.id == this.getCurrentSlideID())
        if (loadedSlide) {
            return loadedSlide
        }
        return this.filtered ? this.filteredPersonalList.get(this.currentListItem - 1) : this.personalList.get(this.currentListItem - 1);
    }

    getCurrentSlideNumber() {
        return this.currentListItem;
    }

    getCurrentSlideID() {
        return this.filtered ? this.filteredPersonalList.personalListItems[this.currentListItem - 1].id : this.personalList.personalListItems[this.currentListItem - 1].id;
    }

    getNextListItemsForThumbnails() {
        return this.filtered ? this.filteredPersonalList.getNextItemsForThumbnails() : this.personalList.getNextItemsForThumbnails();
    }

    areMaxWithAndHeightEnabled() {
        return !this.autoFitSlide;
    }

    removeCurrentImageFromFaves() {
        let currentSlide = this.getCurrentSlide();

        if (currentSlide == null)
            return;

        if (this.favoriteRemotely) {
            if (currentSlide.siteId == SITE_E621) {
                if (!this.cachedSiteManagers.find(sm => sm.id == SITE_E621)) {
                    this.cachedSiteManagers.push(new SiteManagerE621(this.sitesManager, 100))
                }
                this.cachedSiteManagers.find(sm => sm.id == SITE_E621).favorite(false, currentSlide.id)
            }
        }

        this.personalList.tryToRemove(currentSlide);

        this.dataLoader.savePersonalList();

        if (this.currentListItem > (this.filtered ? this.filteredPersonalList.count() : this.personalList.count()))
            this.currentListItem = this.filtered ? this.filteredPersonalList.count() : this.personalList.count();

        this.personalListLoadedEvent.notify();
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

    setPersonalList(personalList) {
        this.personalList = personalList;

        this.dataLoader.savePersonalList();

        if (this.hasPersonalListItems() && this.currentListItem == 0)
            this.currentListItem = 1;

        this.personalListLoadedEvent.notify();
    }

    preloadCurrentSlideIfNeeded() {
        var currentSlide = this.getCurrentSlide()
        if (!currentSlide) return
        let _this = this
        currentSlide.preload();
        this.addLoadedSlide(currentSlide)
    }

    addLoadedSlide(slide) {
        if (this.loadedSlides.find(t => t.id == slide.id)) return
        this.loadedSlides.push(slide)
    }

    preloadNextSlideIfNeeded() {
        if (this.currentListItem < this.getPersonalListItemCount()) {
            var currentSlide = this.getCurrentSlide();
            this.preloadNextUnpreloadedSlideIfInRange();
        }
    }

    preloadNextUnpreloadedSlideIfInRange() {
        if (this.currentListItem < this.getPersonalListItemCount()) {
            var nextSlides = this.getNextListItemsForThumbnails();

            for (var i = 0; i < nextSlides.length; i++) {
                if (!nextSlides[i]) return
                var slide = nextSlides[i];

                if (!slide.isPreloaded) {
                    slide.preload();
                    this.addLoadedSlide(slide)
                    break;
                }
            }
        }
    }

    preloadNextUnpreloadedSlideAfterThisOneIfInRange(startingSlide) {
        if (this.currentListItem < this.getPersonalListItemCount()) {
            var nextSlides = this.getNextListItemsForThumbnails();
            if (!nextSlides) return
            var foundStartingSlide = false;

            for (var i = 0; i < nextSlides.length; i++) {
                var slide = nextSlides[i];

                if (foundStartingSlide || (this.currentListItem == 1 && startingSlide.id == this.getCurrentSlide(1).id)) {
                    foundStartingSlide = true;
                    var _this = this
                    if (!slide.isPreloaded) {
                        slide.preload();
                        this.addLoadedSlide(slide)
                        break;
                    }
                }

                if (startingSlide.id == slide.id) {
                    foundStartingSlide = true;
                }
            }
        }
    }

    isCurrentSlideLoaded() {
        if (this.currentListItem > 0) {
            return this.getCurrentSlide().isPreloaded;
        }
    }

    setE621ApiKey(e621ApiKey) {
        this.e621ApiKey = e621ApiKey;
    }

    setE621Login(e621Login) {
        this.e621Login = e621Login;
    }

    setFavoriteRemotely(onOrOff) {
        this.favoriteRemotely = onOrOff;
    }
}

