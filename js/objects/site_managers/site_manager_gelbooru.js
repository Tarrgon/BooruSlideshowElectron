class SiteManagerGelbooru extends SiteManager {
	constructor(sitesManager, pageLimit) {
		super(sitesManager, SITE_GELBOORU, 'https://gelbooru.com', pageLimit);
	}

	buildPingRequestUrl() {
		return this.url + '/index.php?page=dapi&s=post&q=index&limit=1';
	}

	buildRequestUrl(searchText, pageNumber) {
		var query = this.buildSiteSpecificQuery(searchText);
		let possibleLogin = this.sitesManager.model.gelbooruApiKey && this.sitesManager.model.gelbooruLogin ? '&user_id=' + this.sitesManager.model.gelbooruLogin + '&api_key=' + this.sitesManager.model.gelbooruApiKey : '';
		return this.url + '/index.php?page=dapi&s=post&q=index&tags=' + query + '&pid=' + (pageNumber - 1) + '&limit=' + this.pageLimit + possibleLogin;
	}

	doesResponseTextIndicateOnline(responseText) {
		var parser = new DOMParser();
		var xml = parser.parseFromString(responseText, "text/xml");

		var xmlPosts = xml.getElementsByTagName("post");

		return (xmlPosts.length > 0);
	}

	addSlides(responseText) {
		this.addXmlSlides(responseText);
	}

	addSlide(xmlPost) {
		if (xmlPost.querySelector('file_url') &&
			xmlPost.querySelector('preview_url')) {
			if (this.isPathForSupportedMediaType(xmlPost.querySelector('file_url').innerHTML)) {
				if (this.areSomeTagsAreBlacklisted(xmlPost.querySelector('tags').innerHTML))
					return;
				var newSlide = new Slide(
					SITE_GELBOORU,
					xmlPost.querySelector('id').innerHTML,
					this.reformatFileUrl(xmlPost.querySelector('file_url').innerHTML),
					this.reformatFileUrl(xmlPost.querySelector('preview_url').innerHTML),
					this.url + '/index.php?page=post&s=view&id=' + xmlPost.querySelector('id').innerHTML,
					xmlPost.querySelector('width').innerHTML,
					xmlPost.querySelector('height').innerHTML,
					new Date(xmlPost.querySelector('created_at').innerHTML),
					xmlPost.querySelector('score').innerHTML,
					this.getMediaTypeFromPath(xmlPost.querySelector('file_url').innerHTML),
					xmlPost.querySelector('md5').innerHTML,
					xmlPost.querySelector('tags').innerHTML
				);
				if (!this.sitesManager.model.includeFavorites && this.sitesManager.model.personalList.contains(newSlide)) return
				if (!this.sitesManager.model.showSeen && this.sitesManager.model.seenList != null && this.sitesManager.model.seenList.seenList.includes(newSlide.md5))
					return
				this.allUnsortedSlides.push(newSlide);
			}
		}
	}
}