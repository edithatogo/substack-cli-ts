'use strict';

var axios = require('axios');
var rateLimit = require('axios-rate-limit');
var t = require('io-ts');
var _function = require('fp-ts/function');
var Either = require('fp-ts/Either');
var PathReporter = require('io-ts/PathReporter');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var t__namespace = /*#__PURE__*/_interopNamespaceDefault(t);

/**
 * HTTP client utility for Substack API requests
 */
class HttpClient {
    constructor(baseUrl, token, maxRequestsPerSecond = 25) {
        if (!token) {
            throw new Error('API token is required');
        }
        const instance = axios.create({
            baseURL: baseUrl,
            headers: {
                Cookie: `substack.sid=${token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15',
                'Accept-Encoding': 'gzip, deflate, br'
            }
        });
        this.httpClient = rateLimit(instance, {
            maxRequests: maxRequestsPerSecond,
            perMilliseconds: 1000
        });
    }
    async get(path) {
        const response = await this.httpClient.get(path);
        if (response.status != 200) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.data;
    }
    async post(path, data) {
        const response = await this.httpClient.post(path, data);
        if (response.status != 200) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.data;
    }
    async put(path, data) {
        const response = await this.httpClient.put(path, data);
        if (response.status != 200) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.data;
    }
}

/**
 * Comment entity representing a comment on a post or note
 */
class Comment {
    constructor(rawData, publicationClient) {
        this.rawData = rawData;
        this.publicationClient = publicationClient;
        this.id = rawData.id;
        this.body = rawData.body;
        this.isAdmin = rawData.author_is_admin;
        this.likesCount = undefined; // TODO: Extract from rawData when available
    }
}

/**
 * PreviewPost entity representing a Substack post with truncated content
 */
class PreviewPost {
    constructor(rawData, publicationClient, commentService, postService) {
        this.publicationClient = publicationClient;
        this.commentService = commentService;
        this.postService = postService;
        this.id = rawData.id;
        this.title = rawData.title;
        this.subtitle = rawData.subtitle || '';
        this.truncatedBody = rawData.truncated_body_text || '';
        this.body = rawData.truncated_body_text || '';
        this.likesCount = 0; // TODO: Extract from rawData when available
        this.publishedAt = new Date(rawData.post_date);
        // TODO: Extract author information from rawData
        // For now, use placeholder values
        this.author = {
            id: 0,
            name: 'Unknown Author',
            handle: 'unknown',
            avatarUrl: ''
        };
    }
    /**
     * Fetch the full post data with HTML body content
     * @returns Promise<FullPost> - A FullPost instance with complete content
     * @throws {Error} When full post retrieval fails
     */
    async fullPost() {
        try {
            const fullPostData = await this.postService.getPostById(this.id);
            return new FullPost(fullPostData, this.publicationClient, this.commentService);
        }
        catch (error) {
            throw new Error(`Failed to fetch full post ${this.id}: ${error.message}`);
        }
    }
    /**
     * Get comments for this post
     * @throws {Error} When comment retrieval fails or API is unavailable
     */
    async *comments(options = {}) {
        try {
            const commentsData = await this.commentService.getCommentsForPost(this.id);
            let count = 0;
            for (const commentData of commentsData) {
                if (options.limit && count >= options.limit)
                    break;
                yield new Comment(commentData, this.publicationClient);
                count++;
            }
        }
        catch (error) {
            throw new Error(`Failed to get comments for post ${this.id}: ${error.message}`);
        }
    }
    /**
     * Like this post
     */
    async like() {
        // Implementation will like the post via the client
        throw new Error('Post liking not implemented yet - requires like API');
    }
    /**
     * Add a comment to this post
     */
    async addComment(_data) {
        // Implementation will add comment via the client
        throw new Error('Comment creation not implemented yet - requires comment creation API');
    }
}
/**
 * FullPost entity representing a Substack post with complete HTML content
 */
class FullPost {
    constructor(rawData, publicationClient, commentService) {
        this.publicationClient = publicationClient;
        this.commentService = commentService;
        this.id = rawData.id;
        this.title = rawData.title;
        this.subtitle = rawData.subtitle || '';
        this.truncatedBody = rawData.truncated_body_text || '';
        this.body = rawData.body_html || rawData.htmlBody || rawData.truncated_body_text || '';
        this.likesCount = 0; // TODO: Extract from rawData when available
        this.publishedAt = new Date(rawData.post_date);
        this.url = rawData.canonical_url;
        // TODO: Extract author information from rawData
        // For now, use placeholder values
        this.author = {
            id: 0,
            name: 'Unknown Author',
            handle: 'unknown',
            avatarUrl: ''
        };
        // Prefer body_html from the full post response, fall back to htmlBody for backward compatibility
        this.htmlBody = rawData.body_html || rawData.htmlBody || '';
        this.slug = rawData.slug;
        this.createdAt = new Date(rawData.post_date);
        this.reactions = rawData.reactions;
        this.restacks = rawData.restacks;
        this.postTags = rawData.postTags;
        this.coverImage = rawData.cover_image;
    }
    /**
     * Get comments for this post
     * @throws {Error} When comment retrieval fails or API is unavailable
     */
    async *comments(options = {}) {
        try {
            const commentsData = await this.commentService.getCommentsForPost(this.id);
            let count = 0;
            for (const commentData of commentsData) {
                if (options.limit && count >= options.limit)
                    break;
                yield new Comment(commentData, this.publicationClient);
                count++;
            }
        }
        catch (error) {
            throw new Error(`Failed to get comments for post ${this.id}: ${error.message}`);
        }
    }
    /**
     * Like this post
     */
    async like() {
        // Implementation will like the post via the client
        throw new Error('Post liking not implemented yet - requires like API');
    }
    /**
     * Add a comment to this post
     */
    async addComment(_data) {
        // Implementation will add comment via the client
        throw new Error('Comment creation not implemented yet - requires comment creation API');
    }
}

/**
 * Note entity representing a Substack note
 */
class Note {
    constructor(rawData, publicationClient) {
        var _a, _b;
        this.rawData = rawData;
        this.publicationClient = publicationClient;
        this.id = rawData.entity_key;
        this.body = ((_a = rawData.comment) === null || _a === void 0 ? void 0 : _a.body) || '';
        this.likesCount = ((_b = rawData.comment) === null || _b === void 0 ? void 0 : _b.reaction_count) || 0;
        this.publishedAt = new Date(rawData.context.timestamp);
        // Extract author info from context users
        const firstUser = rawData.context.users[0];
        this.author = {
            id: (firstUser === null || firstUser === void 0 ? void 0 : firstUser.id) || 0,
            name: (firstUser === null || firstUser === void 0 ? void 0 : firstUser.name) || 'Unknown',
            handle: (firstUser === null || firstUser === void 0 ? void 0 : firstUser.handle) || 'unknown',
            avatarUrl: (firstUser === null || firstUser === void 0 ? void 0 : firstUser.photo_url) || ''
        };
    }
    /**
     * Get parent comments for this note
     */
    async *comments() {
        // Convert parent comments to Comment entities
        for (const parentComment of this.rawData.parentComments || []) {
            if (parentComment) {
                // Convert note comment format to SubstackComment format - minimal fields only
                const commentData = {
                    id: parentComment.id,
                    body: parentComment.body,
                    author_is_admin: false // Not available in note comment format
                };
                yield new Comment(commentData, this.publicationClient);
            }
        }
    }
    /**
     * Like this note
     */
    async like() {
        // Implementation will like the note via the client
        // This requires authentication and proper API endpoints
        throw new Error('Note liking not implemented yet - requires like API');
    }
    /**
     * Add a comment to this note
     */
    async addComment(_text) {
        // Implementation will add a comment via the client
        // This requires authentication and proper API endpoints
        throw new Error('Note commenting not implemented yet - requires comment API');
    }
}

/**
 * Base Profile class representing a Substack user profile (read-only)
 */
class Profile {
    constructor(rawData, publicationClient, profileService, postService, noteService, commentService, perPage, resolvedSlug) {
        this.rawData = rawData;
        this.publicationClient = publicationClient;
        this.profileService = profileService;
        this.postService = postService;
        this.noteService = noteService;
        this.commentService = commentService;
        this.perPage = perPage;
        this.id = rawData.id;
        // Use resolved slug from subscriptions cache if available, otherwise fallback to handle
        this.slug = resolvedSlug || rawData.handle;
        this.handle = rawData.handle;
        this.name = rawData.name;
        this.url = `https://substack.com/@${this.handle}`;
        this.avatarUrl = rawData.photo_url;
        this.bio = rawData.bio;
    }
    /**
     * Get posts from this profile's publications
     */
    async *posts(options = {}) {
        try {
            let offset = 0;
            let totalYielded = 0;
            while (true) {
                const postsData = await this.postService.getPostsForProfile(this.id, {
                    limit: this.perPage,
                    offset
                });
                if (!postsData) {
                    break; // No more posts to fetch
                }
                for (const postData of postsData) {
                    if (options.limit && totalYielded >= options.limit) {
                        return; // Stop if we've reached the requested limit
                    }
                    yield new PreviewPost(postData, this.publicationClient, this.commentService, this.postService);
                    totalYielded++;
                }
                // If we got fewer posts than requested, we've reached the end
                if (postsData.length < this.perPage) {
                    break;
                }
                offset += this.perPage;
            }
        }
        catch (error) {
            console.log(error);
            // If the endpoint doesn't exist or fails, return empty iterator
            yield* [];
        }
    }
    /**
     * Get notes from this profile
     */
    async *notes(options = {}) {
        try {
            let cursor = undefined;
            let totalYielded = 0;
            while (true) {
                // Use NoteService to get notes for this profile with cursor-based pagination
                const paginatedNotes = await this.noteService.getNotesForProfile(this.id, {
                    cursor
                });
                if (!paginatedNotes.notes) {
                    break; // No more notes to fetch
                }
                for (const item of paginatedNotes.notes) {
                    if (options.limit && totalYielded >= options.limit) {
                        return; // Stop if we've reached the requested limit
                    }
                    yield new Note(item, this.publicationClient);
                    totalYielded++;
                }
                // If there's no next cursor, we've reached the end
                if (!paginatedNotes.nextCursor) {
                    break;
                }
                cursor = paginatedNotes.nextCursor;
            }
        }
        catch (_a) {
            // If both endpoints fail, return empty iterator
            yield* [];
        }
    }
}

/**
 * OwnProfile extends Profile with write capabilities for the authenticated user
 */
class OwnProfile extends Profile {
    constructor(rawData, publicationClient, profileService, postService, noteService, commentService, followingService, newNoteService, perPage, resolvedSlug) {
        super(rawData, publicationClient, profileService, postService, noteService, commentService, perPage, resolvedSlug);
        this.followingService = followingService;
        this.newNoteService = newNoteService;
    }
    /**
     * Create a new note using the builder pattern
     */
    newNote() {
        return this.newNoteService.newNote();
    }
    /**
     * Create a new note with a link attachment using the builder pattern
     */
    newNoteWithLink(link) {
        return this.newNoteService.newNoteWithLink(link);
    }
    /**
     * Get users that the authenticated user follows
     */
    async *following(options = {}) {
        const followingUsers = await this.followingService.getFollowing();
        let count = 0;
        for (const user of followingUsers) {
            if (options.limit && count >= options.limit)
                break;
            try {
                const profileResponse = await this.profileService.getProfileBySlug(user.handle);
                yield new Profile(profileResponse, this.publicationClient, this.profileService, this.postService, this.noteService, this.commentService, this.perPage, user.handle);
                count++;
            }
            catch (_a) {
                /* empty */
            }
        }
    }
    /**
     * Get notes from the authenticated user's profile
     */
    async *notes(options = {}) {
        try {
            let cursor = undefined;
            let totalYielded = 0;
            while (true) {
                // Use NoteService to fetch notes for the authenticated user with cursor-based pagination
                const paginatedNotes = await this.noteService.getNotesForLoggedUser({
                    cursor
                });
                if (!paginatedNotes.notes) {
                    break; // No more notes to fetch
                }
                for (const noteData of paginatedNotes.notes) {
                    if (options.limit && totalYielded >= options.limit) {
                        return; // Stop if we've reached the requested limit
                    }
                    yield new Note(noteData, this.publicationClient);
                    totalYielded++;
                }
                // If there's no next cursor, we've reached the end
                if (!paginatedNotes.nextCursor) {
                    break;
                }
                cursor = paginatedNotes.nextCursor;
            }
        }
        catch (_a) {
            // If the endpoint doesn't exist or fails, return empty iterator
            yield* [];
        }
    }
}

/**
 * Raw API response shape for posts - minimal validation
 * Only validates fields actually used by PreviewPost domain class
 */
const SubstackPreviewPostCodec = t__namespace.intersection([
    t__namespace.type({
        id: t__namespace.number,
        title: t__namespace.string,
        post_date: t__namespace.string
    }),
    t__namespace.partial({
        subtitle: t__namespace.string,
        truncated_body_text: t__namespace.string
    })
]);

/**
 * Raw API response shape for full posts from /posts/by-id/:id endpoint
 * Only validates fields actually used by FullPost domain class
 */
const SubstackFullPostCodec = t__namespace.intersection([
    t__namespace.type({
        id: t__namespace.number,
        title: t__namespace.string,
        slug: t__namespace.string,
        post_date: t__namespace.string,
        canonical_url: t__namespace.string
    }),
    t__namespace.partial({
        subtitle: t__namespace.string,
        truncated_body_text: t__namespace.string,
        body_html: t__namespace.string,
        htmlBody: t__namespace.string,
        reactions: t__namespace.record(t__namespace.string, t__namespace.number),
        restacks: t__namespace.number,
        postTags: t__namespace.array(t__namespace.string),
        cover_image: t__namespace.string
    })
]);

/**
 * Raw API response shape for comments from /post/{id}/comments endpoint
 * Uses actual field names from the API response
 */
const SubstackCommentCodec = t__namespace.intersection([
    t__namespace.type({
        id: t__namespace.number,
        body: t__namespace.string
    }),
    t__namespace.partial({
        author_is_admin: t__namespace.boolean
    })
]);

/**
 * Response structure from /reader/comment/{id} endpoint - keeping wrapper structure
 */
const SubstackCommentResponseCodec = t__namespace.type({
    item: t__namespace.type({
        comment: t__namespace.intersection([
            t__namespace.type({
                id: t__namespace.number,
                body: t__namespace.string,
                user_id: t__namespace.number,
                name: t__namespace.string,
                date: t__namespace.string
            }),
            t__namespace.partial({
                post_id: t__namespace.union([t__namespace.number, t__namespace.null])
            })
        ])
    })
});

/**
 * Minimal codec for Profile API responses - only validates fields we actually use
 * This is for /user/{slug}/public_profile endpoint
 */
const SubstackFullProfileCodec = t__namespace.intersection([
    t__namespace.type({
        id: t__namespace.number,
        name: t__namespace.string,
        handle: t__namespace.string,
        photo_url: t__namespace.string
    }),
    t__namespace.partial({
        bio: t__namespace.string
    })
]);

/**
 * Minimal codec for Note user in context - only validates fields we actually use
 */
const SubstackNoteUserCodec = t__namespace.type({
    id: t__namespace.number,
    name: t__namespace.string,
    handle: t__namespace.string,
    photo_url: t__namespace.string
});
/**
 * Minimal codec for Note context - only validates fields we actually use
 */
const SubstackNoteContextCodec = t__namespace.type({
    timestamp: t__namespace.string,
    users: t__namespace.array(SubstackNoteUserCodec)
});
/**
 * Minimal codec for Note comment - only validates fields we actually use
 */
const SubstackNoteCommentCodec = t__namespace.intersection([
    t__namespace.type({
        id: t__namespace.number,
        body: t__namespace.string
    }),
    t__namespace.partial({
        reaction_count: t__namespace.number
    })
]);
/**
 * Minimal codec for Note API responses - only validates fields we actually use
 * This is for /reader/feed/profile/{id} and similar note endpoints
 */
t__namespace.intersection([
    t__namespace.type({
        entity_key: t__namespace.string,
        context: SubstackNoteContextCodec
    }),
    t__namespace.partial({
        comment: SubstackNoteCommentCodec,
        parentComments: t__namespace.array(SubstackNoteCommentCodec)
    })
]);

/**
 * Minimal user information codec - only validates fields actually used in the codebase
 * Used fields: id, name, handle, photo_url, bio (optional)
 */
t__namespace.intersection([
    t__namespace.type({
        id: t__namespace.number,
        name: t__namespace.string,
        handle: t__namespace.string,
        photo_url: t__namespace.string
    }),
    t__namespace.partial({
        bio: t__namespace.string
    })
]);

/**
 * Minimal codec for profile item context - only validates the users array
 * Used fields: users[].id, users[].handle
 */
const MinimalUserCodec = t__namespace.type({
    id: t__namespace.number,
    handle: t__namespace.string
});
const SubstackProfileItemContextCodec = t__namespace.type({
    users: t__namespace.array(MinimalUserCodec)
});

/**
 * Minimal codec for PublishNoteResponse - only validates fields actually used
 * Used fields: id, date, body, attachments
 */
const PublishNoteResponseCodec = t__namespace.intersection([
    t__namespace.type({
        id: t__namespace.number,
        date: t__namespace.string
    }),
    t__namespace.partial({
        body: t__namespace.string,
        attachments: t__namespace.array(t__namespace.unknown)
    })
]);

/**
 * Minimal codec for CreateAttachmentResponse - only validates the id field which is actually used
 * Used field: id (to add to attachmentIds array)
 */
const CreateAttachmentResponseCodec = t__namespace.type({
    id: t__namespace.string
});

/**
 * Minimal codec for user profile feed - only validates the context.users array
 * Used fields: items[].context.users[].id, items[].context.users[].handle
 */
const MinimalItemCodec = t__namespace.type({
    context: SubstackProfileItemContextCodec
});
const SubstackUserProfileCodec = t__namespace.type({
    items: t__namespace.array(MinimalItemCodec)
});

const HandleTypeCodec = t__namespace.union([
    t__namespace.literal('existing'),
    t__namespace.literal('subdomain'),
    t__namespace.literal('suggestion')
]);

const PotentialHandleCodec = t__namespace.type({
    id: t__namespace.string,
    handle: t__namespace.string,
    type: HandleTypeCodec
});

const PotentialHandlesCodec = t__namespace.type({
    potentialHandles: t__namespace.array(PotentialHandleCodec)
});

const User = t__namespace.type({
    id: t__namespace.number,
    handle: t__namespace.string
});
const Group = t__namespace.type({
    users: t__namespace.array(User)
});
const SubscriberList = t__namespace.type({
    id: t__namespace.string,
    name: t__namespace.string,
    groups: t__namespace.array(Group)
});
const SubscriberLists = t__namespace.type({
    subscriberLists: t__namespace.array(SubscriberList)
});

/**
 * Utility functions for runtime validation using io-ts and fp-ts
 */
/**
 * Decode and validate data using an io-ts codec
 * @param codec - The io-ts codec to use for validation
 * @param data - The raw data to validate
 * @param errorContext - Context information for error messages
 * @returns The validated data
 * @throws {Error} If validation fails
 */
function decodeOrThrow(codec, data, errorContext) {
    const result = codec.decode(data);
    return _function.pipe(result, Either.fold((_errors) => {
        const errorMessage = PathReporter.PathReporter.report(result).join(', ');
        console.log(`Invalid ${errorContext}: ${errorMessage}`);
        throw new Error(`Invalid ${errorContext}: ${errorMessage}`);
    }, (parsed) => parsed));
}

/**
 * Service responsible for post-related HTTP operations
 * Returns internal types that can be transformed into domain models
 */
class PostService {
    constructor(substackClient) {
        this.substackClient = substackClient;
    }
    /**
     * Get a post by ID from the API
     * @param id - The post ID
     * @returns Promise<SubstackFullPost> - Raw full post data from API (validated)
     * @throws {Error} When post is not found, API request fails, or validation fails
     *
     * Note: Uses SubstackFullPostCodec to validate the full post response from /posts/by-id/:id
     * which includes body_html, postTags, reactions, and other fields not present in preview responses.
     * This codec is specifically designed for FullPost construction.
     */
    async getPostById(id) {
        // Post lookup by ID must use the global substack.com endpoint, not publication-specific hostnames
        const rawResponse = await this.substackClient.get(`/posts/by-id/${id}`);
        // Extract the post data from the wrapper object
        if (!rawResponse.post) {
            throw new Error('Invalid response format: missing post data');
        }
        // Transform the raw post data to match our codec expectations
        const postData = this.transformPostData(rawResponse.post);
        // Validate the response with SubstackFullPostCodec for full post data including body_html
        return decodeOrThrow(SubstackFullPostCodec, postData, 'Full post response');
    }
    /**
     * Transform raw API post data to match our codec structure
     */
    transformPostData(rawPost) {
        const transformedPost = { ...rawPost };
        // Transform postTags from objects to string array
        if (rawPost.postTags && Array.isArray(rawPost.postTags)) {
            transformedPost.postTags = rawPost.postTags.map((tag) => tag.name || tag);
        }
        return transformedPost;
    }
    /**
     * Get posts for a profile
     * @param profileId - The profile user ID
     * @param options - Pagination options
     * @returns Promise<SubstackPreviewPost[]> - Raw post data from API (validated)
     * @throws {Error} When posts cannot be retrieved or validation fails
     */
    async getPostsForProfile(profileId, _options) {
        const response = await this.substackClient.get(`/profile/posts?profile_user_id=${profileId}`);
        const posts = response.posts || [];
        // Validate each post with io-ts
        return posts.map((post, index) => decodeOrThrow(SubstackPreviewPostCodec, post, `Post ${index} in profile response`));
    }
}

/**
 * Service responsible for note-related HTTP operations
 * Returns internal types that can be transformed into domain models
 */
class NoteService {
    constructor(publicationClient) {
        this.publicationClient = publicationClient;
    }
    /**
     * Get a note by ID from the API
     * @param id - The note ID
     * @returns Promise<SubstackNote> - Raw note data from API
     * @throws {Error} When note is not found or API request fails
     */
    async getNoteById(id) {
        // Notes are fetched using the comment endpoint
        const rawResponse = await this.publicationClient.get(`/reader/comment/${id}`);
        // Validate the response structure with io-ts
        const response = decodeOrThrow(SubstackCommentResponseCodec, rawResponse, 'Note comment response');
        // Transform the validated comment response to the SubstackNote structure expected by Note entity
        // Only include minimal fields validated by SubstackNoteCodec
        const noteData = {
            entity_key: String(id),
            context: {
                timestamp: response.item.comment.date,
                users: [
                    {
                        id: response.item.comment.user_id,
                        name: response.item.comment.name,
                        handle: '', // Not available in comment response
                        photo_url: response.item.comment.photo_url || ''
                    }
                ]
            },
            comment: {
                id: response.item.comment.id,
                body: response.item.comment.body,
                reaction_count: 0 // Default value
            },
            parentComments: []
        };
        return noteData;
    }
    /**
     * Get notes for the authenticated user with cursor-based pagination
     * @param options - Pagination options with optional cursor
     * @returns Promise<PaginatedSubstackNotes> - Paginated note data from API
     * @throws {Error} When notes cannot be retrieved
     */
    async getNotesForLoggedUser(options) {
        const url = (options === null || options === void 0 ? void 0 : options.cursor) ? `/notes?cursor=${encodeURIComponent(options.cursor)}` : '/notes';
        const response = await this.publicationClient.get(url);
        return {
            notes: response.items || [],
            nextCursor: response.nextCursor
        };
    }
    /**
     * Get notes for a profile with cursor-based pagination
     * @param profileId - The profile user ID
     * @param options - Pagination options with optional cursor
     * @returns Promise<PaginatedSubstackNotes> - Paginated note data from API
     * @throws {Error} When notes cannot be retrieved
     */
    async getNotesForProfile(profileId, options) {
        const url = (options === null || options === void 0 ? void 0 : options.cursor)
            ? `/reader/feed/profile/${profileId}?types=note&cursor=${encodeURIComponent(options.cursor)}`
            : `/reader/feed/profile/${profileId}?types=note`;
        const response = await this.publicationClient.get(url);
        return {
            notes: response.items || [],
            nextCursor: response.nextCursor
        };
    }
}

/**
 * Service responsible for profile-related HTTP operations
 * Returns internal types that can be transformed into domain models
 */
class ProfileService {
    constructor(substackClient) {
        this.substackClient = substackClient;
    }
    async getOwnSlug() {
        const rawResponse = await this.substackClient.get('/handle/options');
        const data = decodeOrThrow(PotentialHandlesCodec, rawResponse, 'Potential handles response');
        const existingHandle = data.potentialHandles.filter((handle) => handle.type == 'existing')[0];
        return existingHandle.handle;
    }
    /**
     * Get authenticated user's own profile
     * @returns Promise<SubstackFullProfile> - Raw profile data from API
     * @throws {Error} When authentication fails or profile cannot be retrieved
     */
    async getOwnProfile() {
        const ownSlug = await this.getOwnSlug();
        const rawResponse = await this.substackClient.get(`/user/${ownSlug}/public_profile`);
        return decodeOrThrow(SubstackFullProfileCodec, rawResponse, 'Full profile response');
    }
    /**
     * Get a profile by user ID
     * @param id - The user ID
     * @returns Promise<SubstackFullProfile> - Raw profile data from API
     * @throws {Error} When profile is not found or API request fails
     */
    async getProfileById(id) {
        var _a;
        const rawProfileFeed = await this.substackClient.get(`/reader/feed/profile/${id}`);
        const profileFeed = decodeOrThrow(SubstackUserProfileCodec, rawProfileFeed, 'User profile feed response');
        for (const item of profileFeed.items) {
            if (((_a = item.context) === null || _a === void 0 ? void 0 : _a.users.length) > 0) {
                for (const user of item.context.users) {
                    if (user.id === id) {
                        return await this.getProfileBySlug(user.handle);
                    }
                }
            }
        }
        throw new Error(`Profile with ID ${id} not found`);
    }
    /**
     * Get a profile by handle/slug
     * @param slug - The user handle/slug
     * @returns Promise<SubstackFullProfile> - Raw profile data from API
     * @throws {Error} When profile is not found or API request fails
     */
    async getProfileBySlug(slug) {
        const rawResponse = await this.substackClient.get(`/user/${slug}/public_profile`);
        return decodeOrThrow(SubstackFullProfileCodec, rawResponse, 'Full profile response');
    }
}

/**
 * Service responsible for comment-related HTTP operations
 * Returns internal types that can be transformed into domain models
 */
class CommentService {
    constructor(publicationClient) {
        this.publicationClient = publicationClient;
    }
    /**
     * Get comments for a post
     * @param postId - The post ID
     * @returns Promise<SubstackComment[]> - Raw comment data from API (validated)
     * @throws {Error} When comments cannot be retrieved or validation fails
     */
    async getCommentsForPost(postId) {
        const response = await this.publicationClient.get(`/post/${postId}/comments`);
        const comments = response.comments || [];
        // Validate each comment with io-ts
        return comments.map((comment, index) => decodeOrThrow(SubstackCommentCodec, comment, `Comment ${index} in post response`));
    }
    /**
     * Get a specific comment by ID
     * @param id - The comment ID
     * @returns Promise<SubstackComment> - Raw comment data from API (validated)
     * @throws {Error} When comment is not found, API request fails, or validation fails
     */
    async getCommentById(id) {
        const rawResponse = await this.publicationClient.get(`/reader/comment/${id}`);
        // Validate the response structure with io-ts
        const response = decodeOrThrow(SubstackCommentResponseCodec, rawResponse, 'Comment response');
        // Transform the validated API response to match SubstackComment interface
        const commentData = {
            id: response.item.comment.id,
            body: response.item.comment.body,
            author_is_admin: false // Default value since not in response
        };
        // Validate the transformed data as well
        return decodeOrThrow(SubstackCommentCodec, commentData, 'Transformed comment data');
    }
}

/**
 * Service responsible for following-related HTTP operations
 * Returns internal types that can be transformed into domain models
 */
class FollowingService {
    constructor(publicationClient, substackClient) {
        this.publicationClient = publicationClient;
        this.substackClient = substackClient;
    }
    async getOwnId() {
        const { user_id } = await this.substackClient.put('/user-setting', {
            type: 'last_home_tab',
            value_text: 'inbox'
        });
        return user_id;
    }
    /**
     * Get users that the authenticated user follows
     * @returns Promise<FollowingUser[]> - Array of users that the authenticated user follows
     * @throws {Error} When following list cannot be retrieved
     */
    async getFollowing() {
        const userId = await this.getOwnId();
        const data = await this.publicationClient.get(`/user/${userId}/subscriber-lists?lists=following`);
        const lists = SubscriberLists.decode(data);
        if (Either.isLeft(lists)) {
            throw Error(`Could not validate data: ${PathReporter.PathReporter.report(lists).join('\n')}`);
        }
        return lists.right.subscriberLists[0].groups[0].users.map((user) => user);
    }
}

/**
 * Service responsible for checking API connectivity and session validity
 * Provides a clean boolean indicator of whether the API is accessible
 */
class ConnectivityService {
    constructor(substackClient) {
        this.substackClient = substackClient;
    }
    /**
     * Check if the API is connected and accessible
     * Uses a lightweight endpoint to verify connectivity without side effects
     * @returns Promise<boolean> - true if API is accessible, false otherwise
     */
    async isConnected() {
        try {
            await this.substackClient.put('/user-setting', {
                type: 'last_home_tab',
                value_text: 'inbox'
            });
            return true;
        }
        catch (_a) {
            return false;
        }
    }
}

/**
 * Service responsible for creating new notes
 * Provides methods to instantiate note builders
 */
class NewNoteService {
    constructor(substackClient) {
        this.substackClient = substackClient;
    }
    /**
     * Create a new note using the builder pattern
     */
    newNote() {
        return new NoteBuilder(this.substackClient);
    }
    /**
     * Create a new note with a link attachment using the builder pattern
     */
    newNoteWithLink(link) {
        return new NoteWithLinkBuilder(this.substackClient, link);
    }
}

/**
 * Builder for constructing list items - similar to paragraph but no nested lists allowed
 */
class ListItemBuilder {
    constructor(listBuilder, state = { segments: [] }) {
        this.listBuilder = listBuilder;
        this.state = state;
    }
    /**
     * Add plain text to the current list item
     */
    text(text) {
        return new ListItemBuilder(this.listBuilder, {
            segments: [...this.state.segments, { text, type: 'simple' }]
        });
    }
    /**
     * Add bold text to the current list item
     */
    bold(text) {
        return new ListItemBuilder(this.listBuilder, {
            segments: [...this.state.segments, { text, type: 'bold' }]
        });
    }
    /**
     * Add italic text to the current list item
     */
    italic(text) {
        return new ListItemBuilder(this.listBuilder, {
            segments: [...this.state.segments, { text, type: 'italic' }]
        });
    }
    /**
     * Add code text to the current list item
     */
    code(text) {
        return new ListItemBuilder(this.listBuilder, {
            segments: [...this.state.segments, { text, type: 'code' }]
        });
    }
    /**
     * Add underlined text to the current list item
     */
    underline(text) {
        return new ListItemBuilder(this.listBuilder, {
            segments: [...this.state.segments, { text, type: 'underline' }]
        });
    }
    /**
     * Add a link to the current list item
     */
    link(text, url) {
        return new ListItemBuilder(this.listBuilder, {
            segments: [...this.state.segments, { text, type: 'link', url }]
        });
    }
    /**
     * Get the current segments (used by ListBuilder)
     */
    getSegments() {
        return this.state.segments;
    }
    /**
     * Return to the list builder to add another item
     */
    item() {
        // Commit current item and create new one
        return this.listBuilder.addItem({ segments: this.state.segments }).item();
    }
    /**
     * Finish the list and return to paragraph
     */
    finish() {
        // Commit current item
        return this.listBuilder.addItem({ segments: this.state.segments }).finish();
    }
}
/**
 * Builder for constructing lists within a paragraph
 */
class ListBuilder {
    constructor(type, paragraphBuilder, state) {
        this.paragraphBuilder = paragraphBuilder;
        this.state = state || { type, items: [] };
    }
    /**
     * Add an item to the current list
     */
    addItem(item) {
        return new ListBuilder(this.state.type, this.paragraphBuilder, {
            type: this.state.type,
            items: [...this.state.items, item]
        });
    }
    /**
     * Start a new list item
     */
    item() {
        return new ListItemBuilder(this);
    }
    /**
     * Finish the list and return to paragraph
     */
    finish() {
        // Add the completed list to the paragraph
        return this.paragraphBuilder.addList({ type: this.state.type, items: this.state.items });
    }
}
/**
 * Builder for constructing rich text within a paragraph
 */
class ParagraphBuilder {
    constructor(noteBuilder, state = { segments: [], lists: [] }) {
        this.noteBuilder = noteBuilder;
        this.state = state;
    }
    /**
     * Add plain text to the current paragraph
     */
    text(text) {
        return new ParagraphBuilder(this.noteBuilder, {
            segments: [...this.state.segments, { text, type: 'simple' }],
            lists: [...this.state.lists]
        });
    }
    /**
     * Add bold text to the current paragraph
     */
    bold(text) {
        return new ParagraphBuilder(this.noteBuilder, {
            segments: [...this.state.segments, { text, type: 'bold' }],
            lists: [...this.state.lists]
        });
    }
    /**
     * Add italic text to the current paragraph
     */
    italic(text) {
        return new ParagraphBuilder(this.noteBuilder, {
            segments: [...this.state.segments, { text, type: 'italic' }],
            lists: [...this.state.lists]
        });
    }
    /**
     * Add code text to the current paragraph
     */
    code(text) {
        return new ParagraphBuilder(this.noteBuilder, {
            segments: [...this.state.segments, { text, type: 'code' }],
            lists: [...this.state.lists]
        });
    }
    /**
     * Add underlined text to the current paragraph
     */
    underline(text) {
        return new ParagraphBuilder(this.noteBuilder, {
            segments: [...this.state.segments, { text, type: 'underline' }],
            lists: [...this.state.lists]
        });
    }
    /**
     * Add a link to the current paragraph
     */
    link(text, url) {
        return new ParagraphBuilder(this.noteBuilder, {
            segments: [...this.state.segments, { text, type: 'link', url }],
            lists: [...this.state.lists]
        });
    }
    /**
     * Start a bullet list in the current paragraph
     */
    bulletList() {
        return new ListBuilder('bullet', this);
    }
    /**
     * Start a numbered list in the current paragraph
     */
    numberedList() {
        return new ListBuilder('numbered', this);
    }
    /**
     * Add a list to the current paragraph (used by ListBuilder)
     */
    addList(list) {
        return new ParagraphBuilder(this.noteBuilder, {
            segments: [...this.state.segments],
            lists: [...this.state.lists, list]
        });
    }
    /**
     * Get the current paragraph content (used by NoteBuilder)
     */
    getParagraphContent() {
        return { segments: this.state.segments, lists: this.state.lists };
    }
    /**
     * Start a new paragraph
     */
    paragraph() {
        // Commit the current paragraph
        return this.noteBuilder.addParagraph(this.getParagraphContent()).paragraph();
    }
    /**
     * Build and validate the note
     */
    build() {
        // Commit the current paragraph before building
        return this.noteBuilder.addParagraph(this.getParagraphContent()).build();
    }
    /**
     * Publish the note directly
     */
    async publish() {
        // Commit the current paragraph before publishing
        return this.noteBuilder.addParagraph(this.getParagraphContent()).publish();
    }
}
class NoteBuilder {
    constructor(substackClient, state = { paragraphs: [] }) {
        this.substackClient = substackClient;
        this.state = state;
    }
    /**
     * Add a paragraph to the note (used by ParagraphBuilder)
     */
    addParagraph(paragraph) {
        return new NoteBuilder(this.substackClient, {
            paragraphs: [...this.state.paragraphs, paragraph],
            attachmentIds: this.state.attachmentIds
        });
    }
    /**
     * Start a paragraph
     */
    paragraph() {
        return new ParagraphBuilder(this);
    }
    /**
     * Convert the builder's content to Substack's note format
     */
    toNoteRequest() {
        // Validation: must have at least one paragraph
        if (this.state.paragraphs.length === 0) {
            throw new Error('Note must contain at least one paragraph');
        }
        // Validation: each paragraph must have content
        for (const paragraph of this.state.paragraphs) {
            if (paragraph.segments.length === 0 && paragraph.lists.length === 0) {
                throw new Error('Each paragraph must contain at least one content block');
            }
        }
        const content = this.state.paragraphs.flatMap((paragraph) => {
            const elements = [];
            // Add paragraph content if it has segments
            if (paragraph.segments.length > 0) {
                elements.push({
                    type: 'paragraph',
                    content: paragraph.segments.map((segment) => this.segmentToContent(segment))
                });
            }
            // Add list content
            for (const list of paragraph.lists) {
                elements.push({
                    type: list.type === 'bullet' ? 'bulletList' : 'orderedList',
                    content: list.items.map((item) => ({
                        type: 'listItem',
                        content: [
                            {
                                type: 'paragraph',
                                content: item.segments.map((segment) => this.segmentToContent(segment))
                            }
                        ]
                    }))
                });
            }
            return elements;
        });
        const request = {
            bodyJson: {
                type: 'doc',
                attrs: {
                    schemaVersion: 'v1'
                },
                content
            },
            tabId: 'for-you',
            surface: 'feed',
            replyMinimumRole: 'everyone'
        };
        if (this.state.attachmentIds && this.state.attachmentIds.length > 0) {
            request.attachmentIds = this.state.attachmentIds;
        }
        return request;
    }
    /**
     * Convert a text segment to Substack content format
     */
    segmentToContent(segment) {
        const base = {
            type: 'text',
            text: segment.text
        };
        if (segment.type === 'simple') {
            return base;
        }
        if (segment.type === 'link') {
            if (!segment.url) {
                throw new Error('Link segments must have a URL');
            }
            return {
                ...base,
                marks: [{ type: 'link', attrs: { href: segment.url } }]
            };
        }
        // For other formatting types
        return {
            ...base,
            marks: [{ type: segment.type }]
        };
    }
    /**
     * Build and validate the note
     */
    build() {
        return this.toNoteRequest();
    }
    /**
     * Publish the note
     */
    async publish() {
        const rawResponse = await this.substackClient.post('/comment/feed/', this.toNoteRequest());
        return decodeOrThrow(PublishNoteResponseCodec, rawResponse, 'Publish note response');
    }
}
/**
 * Extended NoteBuilder that creates an attachment for a link and publishes the note with the attachment
 */
class NoteWithLinkBuilder extends NoteBuilder {
    constructor(substackClient, linkUrl) {
        super(substackClient);
        this.linkUrl = linkUrl;
    }
    /**
     * Add a paragraph to the note (used by ParagraphBuilder) - returns NoteWithLinkBuilder to preserve attachment logic
     */
    addParagraph(paragraph) {
        return new NoteWithLinkBuilder(this.substackClient, this.linkUrl).copyState({
            paragraphs: [...this.state.paragraphs, paragraph],
            attachmentIds: this.state.attachmentIds
        });
    }
    /**
     * Publish the note with the link attachment
     */
    async publish() {
        // First, create the attachment for the link
        const attachmentRequest = {
            url: this.linkUrl,
            type: 'link'
        };
        const rawAttachmentResponse = await this.substackClient.post('/comment/attachment/', attachmentRequest);
        const attachmentResponse = decodeOrThrow(CreateAttachmentResponseCodec, rawAttachmentResponse, 'Create attachment response');
        // Update the state with the attachment ID
        const updatedState = {
            paragraphs: this.state.paragraphs,
            attachmentIds: [attachmentResponse.id]
        };
        // Create the request with attachment
        const request = this.toNoteRequestWithState(updatedState);
        // Publish the note with attachment
        const rawPublishResponse = await this.substackClient.post('/comment/feed/', request);
        return decodeOrThrow(PublishNoteResponseCodec, rawPublishResponse, 'Publish note response');
    }
    /**
     * Copy state to new instance - helper method
     */
    copyState(state) {
        const newBuilder = new NoteWithLinkBuilder(this.substackClient, this.linkUrl);
        newBuilder.state = state;
        return newBuilder;
    }
    /**
     * Convert the builder's content to Substack's note format with custom state
     */
    toNoteRequestWithState(state) {
        // Validation: must have at least one paragraph
        if (state.paragraphs.length === 0) {
            throw new Error('Note must contain at least one paragraph');
        }
        // Validation: each paragraph must have content
        for (const paragraph of state.paragraphs) {
            if (paragraph.segments.length === 0 && paragraph.lists.length === 0) {
                throw new Error('Each paragraph must contain at least one content block');
            }
        }
        const content = state.paragraphs.flatMap((paragraph) => {
            const elements = [];
            // Add paragraph content if it has segments
            if (paragraph.segments.length > 0) {
                elements.push({
                    type: 'paragraph',
                    content: paragraph.segments.map((segment) => this.segmentToContent(segment))
                });
            }
            // Add list content
            for (const list of paragraph.lists) {
                elements.push({
                    type: list.type === 'bullet' ? 'bulletList' : 'orderedList',
                    content: list.items.map((item) => ({
                        type: 'listItem',
                        content: [
                            {
                                type: 'paragraph',
                                content: item.segments.map((segment) => this.segmentToContent(segment))
                            }
                        ]
                    }))
                });
            }
            return elements;
        });
        const request = {
            bodyJson: {
                type: 'doc',
                attrs: {
                    schemaVersion: 'v1'
                },
                content
            },
            tabId: 'for-you',
            surface: 'feed',
            replyMinimumRole: 'everyone'
        };
        if (state.attachmentIds && state.attachmentIds.length > 0) {
            request.attachmentIds = state.attachmentIds;
        }
        return request;
    }
}

/**
 * Modern SubstackClient with entity-based API
 */
class SubstackClient {
    /**
     * Normalize URL by ensuring it has a protocol
     * If no protocol is specified, defaults to https://
     */
    static normalizeUrl(url) {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        return `https://${url}`;
    }
    constructor(config) {
        // Normalize URLs to ensure they have protocols
        const normalizedPublicationUrl = SubstackClient.normalizeUrl(config.publicationUrl);
        const normalizedSubstackUrl = SubstackClient.normalizeUrl(config.substackUrl || 'substack.com');
        // Determine URL prefix
        const urlPrefix = config.urlPrefix !== undefined ? config.urlPrefix : 'api/v1';
        // Store configuration
        this.perPage = config.perPage || 25;
        const maxRequestsPerSecond = config.maxRequestsPerSecond || 25;
        // Construct full base URL for publication-specific endpoints
        const publicationBaseUrl = urlPrefix
            ? `${normalizedPublicationUrl}/${urlPrefix}`
            : normalizedPublicationUrl;
        this.publicationClient = new HttpClient(publicationBaseUrl, config.token, maxRequestsPerSecond);
        // Construct full base URL for global Substack endpoints
        const substackBaseUrl = urlPrefix
            ? `${normalizedSubstackUrl}/${urlPrefix}`
            : normalizedSubstackUrl;
        this.substackClient = new HttpClient(substackBaseUrl, config.token, maxRequestsPerSecond);
        // Initialize services
        this.postService = new PostService(this.substackClient);
        this.noteService = new NoteService(this.publicationClient);
        this.profileService = new ProfileService(this.substackClient);
        this.commentService = new CommentService(this.publicationClient);
        this.followingService = new FollowingService(this.publicationClient, this.substackClient);
        this.connectivityService = new ConnectivityService(this.substackClient);
        this.newNoteService = new NewNoteService(this.substackClient);
    }
    /**
     * Test API connectivity
     */
    async testConnectivity() {
        return await this.connectivityService.isConnected();
    }
    /**
     * Get the authenticated user's own profile with write capabilities
     * @throws {Error} When authentication fails or user profile cannot be retrieved
     */
    async ownProfile() {
        try {
            const profile = await this.profileService.getOwnProfile();
            return new OwnProfile(profile, this.publicationClient, this.profileService, this.postService, this.noteService, this.commentService, this.followingService, this.newNoteService, this.perPage, profile.handle);
        }
        catch (error) {
            throw new Error(`Failed to get own profile: ${error.message}`);
        }
    }
    /**
     * Get a profile by handle/slug
     */
    async profileForSlug(slug) {
        if (!slug || slug.trim() === '') {
            throw new Error('Profile slug cannot be empty');
        }
        try {
            const profile = await this.profileService.getProfileBySlug(slug);
            return new Profile(profile, this.publicationClient, this.profileService, this.postService, this.noteService, this.commentService, this.perPage, profile.handle);
        }
        catch (error) {
            throw new Error(`Profile with slug '${slug}' not found: ${error.message}`);
        }
    }
    /**
     * Get a profile by user ID
     */
    async profileForId(id) {
        try {
            const profile = await this.profileService.getProfileById(id);
            return new Profile(profile, this.publicationClient, this.profileService, this.postService, this.noteService, this.commentService, this.perPage, profile.handle);
        }
        catch (error) {
            throw new Error(`Profile with ID ${id} not found: ${error.message}`);
        }
    }
    /**
     * Get a specific post by ID
     */
    async postForId(id) {
        try {
            const post = await this.postService.getPostById(id);
            return new FullPost(post, this.publicationClient, this.commentService);
        }
        catch (error) {
            throw new Error(`Post with ID ${id} not found: ${error.message}`);
        }
    }
    /**
     * Get a specific note by ID
     */
    async noteForId(id) {
        try {
            const noteData = await this.noteService.getNoteById(id);
            return new Note(noteData, this.publicationClient);
        }
        catch (_a) {
            throw new Error(`Note with ID ${id} not found`);
        }
    }
    /**
     * Get a specific comment by ID
     */
    async commentForId(id) {
        try {
            const commentData = await this.commentService.getCommentById(id);
            return new Comment(commentData, this.publicationClient);
        }
        catch (error) {
            throw new Error(`Comment with ID ${id} not found: ${error.message}`);
        }
    }
}

exports.Comment = Comment;
exports.FullPost = FullPost;
exports.ListBuilder = ListBuilder;
exports.ListItemBuilder = ListItemBuilder;
exports.Note = Note;
exports.NoteBuilder = NoteBuilder;
exports.NoteWithLinkBuilder = NoteWithLinkBuilder;
exports.OwnProfile = OwnProfile;
exports.ParagraphBuilder = ParagraphBuilder;
exports.PreviewPost = PreviewPost;
exports.Profile = Profile;
exports.SubstackClient = SubstackClient;
