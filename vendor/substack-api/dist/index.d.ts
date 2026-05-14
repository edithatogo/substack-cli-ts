import * as t from 'io-ts';

/**
 * Raw API response shape for posts - minimal validation
 * Only validates fields actually used by PreviewPost domain class
 */
declare const SubstackPreviewPostCodec: t.IntersectionC<[t.TypeC<{
    id: t.NumberC;
    title: t.StringC;
    post_date: t.StringC;
}>, t.PartialC<{
    subtitle: t.StringC;
    truncated_body_text: t.StringC;
}>]>;
type SubstackPreviewPost = t.TypeOf<typeof SubstackPreviewPostCodec>;

/**
 * Raw API response shape for full posts from /posts/by-id/:id endpoint
 * Only validates fields actually used by FullPost domain class
 */
declare const SubstackFullPostCodec: t.IntersectionC<[t.TypeC<{
    id: t.NumberC;
    title: t.StringC;
    slug: t.StringC;
    post_date: t.StringC;
    canonical_url: t.StringC;
}>, t.PartialC<{
    subtitle: t.StringC;
    truncated_body_text: t.StringC;
    body_html: t.StringC;
    htmlBody: t.StringC;
    reactions: t.RecordC<t.StringC, t.NumberC>;
    restacks: t.NumberC;
    postTags: t.ArrayC<t.StringC>;
    cover_image: t.StringC;
}>]>;
type SubstackFullPost = t.TypeOf<typeof SubstackFullPostCodec>;

/**
 * Raw API response shape for comments from /post/{id}/comments endpoint
 * Uses actual field names from the API response
 */
declare const SubstackCommentCodec: t.IntersectionC<[t.TypeC<{
    id: t.NumberC;
    body: t.StringC;
}>, t.PartialC<{
    author_is_admin: t.BooleanC;
}>]>;
type SubstackComment = t.TypeOf<typeof SubstackCommentCodec>;

/**
 * Minimal codec for Profile API responses - only validates fields we actually use
 * This is for /user/{slug}/public_profile endpoint
 */
declare const SubstackFullProfileCodec: t.IntersectionC<[t.TypeC<{
    id: t.NumberC;
    name: t.StringC;
    handle: t.StringC;
    photo_url: t.StringC;
}>, t.PartialC<{
    bio: t.StringC;
}>]>;
type SubstackFullProfile = t.TypeOf<typeof SubstackFullProfileCodec>;

/**
 * Minimal codec for Note API responses - only validates fields we actually use
 * This is for /reader/feed/profile/{id} and similar note endpoints
 */
declare const SubstackNoteCodec: t.IntersectionC<[t.TypeC<{
    entity_key: t.StringC;
    context: t.TypeC<{
        timestamp: t.StringC;
        users: t.ArrayC<t.TypeC<{
            id: t.NumberC;
            name: t.StringC;
            handle: t.StringC;
            photo_url: t.StringC;
        }>>;
    }>;
}>, t.PartialC<{
    comment: t.IntersectionC<[t.TypeC<{
        id: t.NumberC;
        body: t.StringC;
    }>, t.PartialC<{
        reaction_count: t.NumberC;
    }>]>;
    parentComments: t.ArrayC<t.IntersectionC<[t.TypeC<{
        id: t.NumberC;
        body: t.StringC;
    }>, t.PartialC<{
        reaction_count: t.NumberC;
    }>]>>;
}>]>;
type SubstackNote = t.TypeOf<typeof SubstackNoteCodec>;

/**
 * Minimal user information codec - only validates fields actually used in the codebase
 * Used fields: id, name, handle, photo_url, bio (optional)
 */
declare const SubstackUserCodec: t.IntersectionC<[t.TypeC<{
    id: t.NumberC;
    name: t.StringC;
    handle: t.StringC;
    photo_url: t.StringC;
}>, t.PartialC<{
    bio: t.StringC;
}>]>;
type SubstackUser = t.TypeOf<typeof SubstackUserCodec>;

/**
 * Base publication information in flattened form
 */
declare const SubstackPublicationBaseCodec: t.IntersectionC<[t.TypeC<{
    id: t.NumberC;
    name: t.StringC;
    subdomain: t.StringC;
    custom_domain_optional: t.BooleanC;
    logo_url: t.StringC;
    author_id: t.NumberC;
    user_id: t.NumberC;
    handles_enabled: t.BooleanC;
    explicit: t.BooleanC;
    is_personal_mode: t.BooleanC;
    payments_state: t.StringC;
    pledges_enabled: t.BooleanC;
}>, t.PartialC<{
    custom_domain: t.StringC;
}>]>;
type SubstackPublicationBase = t.TypeOf<typeof SubstackPublicationBaseCodec>;

/**
 * Extended publication information for profile contexts
 */
interface SubstackProfilePublication extends SubstackPublicationBase {
    hero_text?: string;
    primary_user_id: number;
    theme_var_background_pop: string;
    created_at: string;
    email_from_name?: string | null;
    copyright?: string;
    founding_plan_name?: string;
    community_enabled: boolean;
    invite_only: boolean;
    language?: string | null;
    homepage_type: string;
    author: SubstackUser;
}

/**
 * User link information
 */
interface SubstackUserLink {
    id: number;
    value: string;
    url: string;
    type?: string | null;
    label: string;
}

/**
 * Publication user relationship information
 */
interface SubstackPublicationUser {
    id: number;
    user_id: number;
    publication_id: number;
    role: string;
    public: boolean;
    is_primary: boolean;
    publication: SubstackProfilePublication;
}

/**
 * Subscription information
 */
interface SubstackProfileSubscription {
    user_id: number;
    id: number;
    visibility: string;
    membership_state: string;
    type?: string | null;
    is_founding: boolean;
    email_settings?: Record<string, string>;
    section_podcasts_enabled?: number[];
    publication: SubstackProfilePublication;
}

interface NoteBodyJson {
    type: 'doc';
    attrs: {
        schemaVersion: 'v1';
    };
    content: Array<{
        type: 'paragraph';
        content: Array<{
            type: 'text';
            text: string;
            marks?: Array<{
                type: 'bold' | 'italic' | 'code' | 'underline' | 'link';
                attrs?: {
                    href: string;
                };
            }>;
        }>;
    } | {
        type: 'bulletList' | 'orderedList';
        content: Array<{
            type: 'listItem';
            content: Array<{
                type: 'paragraph';
                content: Array<{
                    type: 'text';
                    text: string;
                    marks?: Array<{
                        type: 'bold' | 'italic' | 'code' | 'underline' | 'link';
                        attrs?: {
                            href: string;
                        };
                    }>;
                }>;
            }>;
        }>;
    }>;
}

interface PublishNoteRequest {
    bodyJson: NoteBodyJson;
    tabId: string;
    surface: string;
    replyMinimumRole: 'everyone';
    attachmentIds?: string[];
}

/**
 * Minimal codec for PublishNoteResponse - only validates fields actually used
 * Used fields: id, date, body, attachments
 */
declare const PublishNoteResponseCodec: t.IntersectionC<[t.TypeC<{
    id: t.NumberC;
    date: t.StringC;
}>, t.PartialC<{
    body: t.StringC;
    attachments: t.ArrayC<t.UnknownC>;
}>]>;
type PublishNoteResponse = t.TypeOf<typeof PublishNoteResponseCodec>;

/**
 * Paginated response for notes API that supports cursor-based pagination
 */
interface PaginatedSubstackNotes {
    notes: SubstackNote[];
    nextCursor?: string;
}

interface SubstackPublicProfile extends SubstackUser {
    tos_accepted_at?: string | null;
    profile_disabled: boolean;
    publicationUsers: SubstackPublicationUser[];
    userLinks: SubstackUserLink[];
    subscriptions: SubstackProfileSubscription[];
    subscriptionsTruncated: boolean;
    hasGuestPost: boolean;
    primaryPublication?: SubstackPublicationBase;
    max_pub_tier: number;
    handle: string;
    hasActivity: boolean;
    hasLikes: boolean;
    lists: unknown[];
    rough_num_free_subscribers_int: number;
    rough_num_free_subscribers: string;
    bestseller_badge_disabled: boolean;
    subscriberCountString: string;
    subscriberCount: string;
    subscriberCountNumber: number;
    hasHiddenPublicationUsers: boolean;
    visibleSubscriptionsCount: number;
    slug: string;
    previousSlug?: string;
    primaryPublicationIsPledged: boolean;
    primaryPublicationSubscriptionState: string;
    isSubscribed: boolean;
    isFollowing: boolean;
    followsViewer: boolean;
    can_dm: boolean;
    dm_upgrade_options: string[];
}

declare class HttpClient {
    private readonly httpClient;
    constructor(baseUrl: string, token: string, maxRequestsPerSecond?: number);
    get<T>(path: string): Promise<T>;
    post<T>(path: string, data?: unknown): Promise<T>;
    put<T>(path: string, data?: unknown): Promise<T>;
}

/**
 * Service responsible for post-related HTTP operations
 * Returns internal types that can be transformed into domain models
 */
declare class PostService {
    private readonly substackClient;
    constructor(substackClient: HttpClient);
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
    getPostById(id: number): Promise<SubstackFullPost>;
    /**
     * Transform raw API post data to match our codec structure
     */
    private transformPostData;
    /**
     * Get posts for a profile
     * @param profileId - The profile user ID
     * @param options - Pagination options
     * @returns Promise<SubstackPreviewPost[]> - Raw post data from API (validated)
     * @throws {Error} When posts cannot be retrieved or validation fails
     */
    getPostsForProfile(profileId: number, _options: {
        limit: number;
        offset: number;
    }): Promise<Array<SubstackPreviewPost>>;
}

/**
 * Service responsible for note-related HTTP operations
 * Returns internal types that can be transformed into domain models
 */
declare class NoteService {
    private readonly publicationClient;
    constructor(publicationClient: HttpClient);
    /**
     * Get a note by ID from the API
     * @param id - The note ID
     * @returns Promise<SubstackNote> - Raw note data from API
     * @throws {Error} When note is not found or API request fails
     */
    getNoteById(id: number): Promise<SubstackNote>;
    /**
     * Get notes for the authenticated user with cursor-based pagination
     * @param options - Pagination options with optional cursor
     * @returns Promise<PaginatedSubstackNotes> - Paginated note data from API
     * @throws {Error} When notes cannot be retrieved
     */
    getNotesForLoggedUser(options?: {
        cursor?: string;
    }): Promise<PaginatedSubstackNotes>;
    /**
     * Get notes for a profile with cursor-based pagination
     * @param profileId - The profile user ID
     * @param options - Pagination options with optional cursor
     * @returns Promise<PaginatedSubstackNotes> - Paginated note data from API
     * @throws {Error} When notes cannot be retrieved
     */
    getNotesForProfile(profileId: number, options?: {
        cursor?: string;
    }): Promise<PaginatedSubstackNotes>;
}

/**
 * Service responsible for profile-related HTTP operations
 * Returns internal types that can be transformed into domain models
 */
declare class ProfileService {
    private readonly substackClient;
    constructor(substackClient: HttpClient);
    getOwnSlug(): Promise<string>;
    /**
     * Get authenticated user's own profile
     * @returns Promise<SubstackFullProfile> - Raw profile data from API
     * @throws {Error} When authentication fails or profile cannot be retrieved
     */
    getOwnProfile(): Promise<SubstackFullProfile>;
    /**
     * Get a profile by user ID
     * @param id - The user ID
     * @returns Promise<SubstackFullProfile> - Raw profile data from API
     * @throws {Error} When profile is not found or API request fails
     */
    getProfileById(id: number): Promise<SubstackFullProfile>;
    /**
     * Get a profile by handle/slug
     * @param slug - The user handle/slug
     * @returns Promise<SubstackFullProfile> - Raw profile data from API
     * @throws {Error} When profile is not found or API request fails
     */
    getProfileBySlug(slug: string): Promise<SubstackFullProfile>;
}

/**
 * Service responsible for comment-related HTTP operations
 * Returns internal types that can be transformed into domain models
 */
declare class CommentService {
    private readonly publicationClient;
    constructor(publicationClient: HttpClient);
    /**
     * Get comments for a post
     * @param postId - The post ID
     * @returns Promise<SubstackComment[]> - Raw comment data from API (validated)
     * @throws {Error} When comments cannot be retrieved or validation fails
     */
    getCommentsForPost(postId: number): Promise<SubstackComment[]>;
    /**
     * Get a specific comment by ID
     * @param id - The comment ID
     * @returns Promise<SubstackComment> - Raw comment data from API (validated)
     * @throws {Error} When comment is not found, API request fails, or validation fails
     */
    getCommentById(id: number): Promise<SubstackComment>;
}

type FollowingUser = {
    id: number;
    handle: string;
};
/**
 * Service responsible for following-related HTTP operations
 * Returns internal types that can be transformed into domain models
 */
declare class FollowingService {
    private readonly publicationClient;
    private readonly substackClient;
    constructor(publicationClient: HttpClient, substackClient: HttpClient);
    getOwnId(): Promise<number>;
    /**
     * Get users that the authenticated user follows
     * @returns Promise<FollowingUser[]> - Array of users that the authenticated user follows
     * @throws {Error} When following list cannot be retrieved
     */
    getFollowing(): Promise<FollowingUser[]>;
}

interface TextSegment {
    text: string;
    type: 'bold' | 'italic' | 'code' | 'underline' | 'link' | 'simple';
    url?: string;
}
interface ListItem {
    segments: TextSegment[];
}
interface List {
    type: 'bullet' | 'numbered';
    items: ListItem[];
}

interface ListItemBuilderState {
    segments: TextSegment[];
}
interface ListBuilderState {
    type: 'bullet' | 'numbered';
    items: ListItem[];
}
interface ParagraphBuilderState {
    segments: TextSegment[];
    lists: List[];
}
interface NoteBuilderState {
    paragraphs: Array<{
        segments: TextSegment[];
        lists: List[];
    }>;
    attachmentIds?: string[];
}
/**
 * Builder for constructing list items - similar to paragraph but no nested lists allowed
 */
declare class ListItemBuilder {
    private readonly listBuilder;
    private readonly state;
    constructor(listBuilder: ListBuilder, state?: ListItemBuilderState);
    /**
     * Add plain text to the current list item
     */
    text(text: string): ListItemBuilder;
    /**
     * Add bold text to the current list item
     */
    bold(text: string): ListItemBuilder;
    /**
     * Add italic text to the current list item
     */
    italic(text: string): ListItemBuilder;
    /**
     * Add code text to the current list item
     */
    code(text: string): ListItemBuilder;
    /**
     * Add underlined text to the current list item
     */
    underline(text: string): ListItemBuilder;
    /**
     * Add a link to the current list item
     */
    link(text: string, url: string): ListItemBuilder;
    /**
     * Get the current segments (used by ListBuilder)
     */
    getSegments(): TextSegment[];
    /**
     * Return to the list builder to add another item
     */
    item(): ListItemBuilder;
    /**
     * Finish the list and return to paragraph
     */
    finish(): ParagraphBuilder;
}
/**
 * Builder for constructing lists within a paragraph
 */
declare class ListBuilder {
    private readonly paragraphBuilder;
    private readonly state;
    constructor(type: 'bullet' | 'numbered', paragraphBuilder: ParagraphBuilder, state?: ListBuilderState);
    /**
     * Add an item to the current list
     */
    addItem(item: ListItem): ListBuilder;
    /**
     * Start a new list item
     */
    item(): ListItemBuilder;
    /**
     * Finish the list and return to paragraph
     */
    finish(): ParagraphBuilder;
}
/**
 * Builder for constructing rich text within a paragraph
 */
declare class ParagraphBuilder {
    private readonly noteBuilder;
    private readonly state;
    constructor(noteBuilder: NoteBuilder, state?: ParagraphBuilderState);
    /**
     * Add plain text to the current paragraph
     */
    text(text: string): ParagraphBuilder;
    /**
     * Add bold text to the current paragraph
     */
    bold(text: string): ParagraphBuilder;
    /**
     * Add italic text to the current paragraph
     */
    italic(text: string): ParagraphBuilder;
    /**
     * Add code text to the current paragraph
     */
    code(text: string): ParagraphBuilder;
    /**
     * Add underlined text to the current paragraph
     */
    underline(text: string): ParagraphBuilder;
    /**
     * Add a link to the current paragraph
     */
    link(text: string, url: string): ParagraphBuilder;
    /**
     * Start a bullet list in the current paragraph
     */
    bulletList(): ListBuilder;
    /**
     * Start a numbered list in the current paragraph
     */
    numberedList(): ListBuilder;
    /**
     * Add a list to the current paragraph (used by ListBuilder)
     */
    addList(list: List): ParagraphBuilder;
    /**
     * Get the current paragraph content (used by NoteBuilder)
     */
    getParagraphContent(): {
        segments: TextSegment[];
        lists: List[];
    };
    /**
     * Start a new paragraph
     */
    paragraph(): ParagraphBuilder;
    /**
     * Build and validate the note
     */
    build(): PublishNoteRequest;
    /**
     * Publish the note directly
     */
    publish(): Promise<PublishNoteResponse>;
}
declare class NoteBuilder {
    protected readonly substackClient: HttpClient;
    protected readonly state: NoteBuilderState;
    constructor(substackClient: HttpClient, state?: NoteBuilderState);
    /**
     * Add a paragraph to the note (used by ParagraphBuilder)
     */
    addParagraph(paragraph: {
        segments: TextSegment[];
        lists: List[];
    }): NoteBuilder;
    /**
     * Start a paragraph
     */
    paragraph(): ParagraphBuilder;
    /**
     * Convert the builder's content to Substack's note format
     */
    private toNoteRequest;
    /**
     * Convert a text segment to Substack content format
     */
    protected segmentToContent(segment: TextSegment): {
        type: "text";
        text: string;
    } | {
        marks: {
            type: "link";
            attrs: {
                href: string;
            };
        }[];
        type: "text";
        text: string;
    } | {
        marks: {
            type: "bold" | "italic" | "code" | "underline";
        }[];
        type: "text";
        text: string;
    };
    /**
     * Build and validate the note
     */
    build(): PublishNoteRequest;
    /**
     * Publish the note
     */
    publish(): Promise<PublishNoteResponse>;
}
/**
 * Extended NoteBuilder that creates an attachment for a link and publishes the note with the attachment
 */
declare class NoteWithLinkBuilder extends NoteBuilder {
    private readonly linkUrl;
    constructor(substackClient: HttpClient, linkUrl: string);
    /**
     * Add a paragraph to the note (used by ParagraphBuilder) - returns NoteWithLinkBuilder to preserve attachment logic
     */
    addParagraph(paragraph: {
        segments: TextSegment[];
        lists: List[];
    }): NoteWithLinkBuilder;
    /**
     * Publish the note with the link attachment
     */
    publish(): Promise<PublishNoteResponse>;
    /**
     * Copy state to new instance - helper method
     */
    private copyState;
    /**
     * Convert the builder's content to Substack's note format with custom state
     */
    private toNoteRequestWithState;
}

/**
 * Service responsible for creating new notes
 * Provides methods to instantiate note builders
 */
declare class NewNoteService {
    private readonly substackClient;
    constructor(substackClient: HttpClient);
    /**
     * Create a new note using the builder pattern
     */
    newNote(): NoteBuilder;
    /**
     * Create a new note with a link attachment using the builder pattern
     */
    newNoteWithLink(link: string): NoteWithLinkBuilder;
}

/**
 * Comment entity representing a comment on a post or note
 */
declare class Comment {
    private readonly rawData;
    private readonly publicationClient;
    readonly id: number;
    readonly body: string;
    readonly isAdmin?: boolean;
    readonly likesCount?: number;
    constructor(rawData: SubstackComment, publicationClient: HttpClient);
}

/**
 * Post interface defining the common contract for all post types
 */
interface Post {
    readonly id: number;
    readonly title: string;
    readonly subtitle: string;
    readonly body: string;
    readonly truncatedBody: string;
    readonly likesCount: number;
    readonly author: {
        id: number;
        name: string;
        handle: string;
        avatarUrl: string;
    };
    readonly publishedAt: Date;
    comments(options?: {
        limit?: number;
    }): AsyncIterable<Comment>;
    like(): Promise<void>;
    addComment(data: {
        body: string;
    }): Promise<Comment>;
}
/**
 * PreviewPost entity representing a Substack post with truncated content
 */
declare class PreviewPost implements Post {
    private readonly publicationClient;
    private readonly commentService;
    private readonly postService;
    readonly id: number;
    readonly title: string;
    readonly subtitle: string;
    readonly body: string;
    readonly truncatedBody: string;
    readonly likesCount: number;
    readonly author: {
        id: number;
        name: string;
        handle: string;
        avatarUrl: string;
    };
    readonly publishedAt: Date;
    constructor(rawData: SubstackPreviewPost, publicationClient: HttpClient, commentService: CommentService, postService: PostService);
    /**
     * Fetch the full post data with HTML body content
     * @returns Promise<FullPost> - A FullPost instance with complete content
     * @throws {Error} When full post retrieval fails
     */
    fullPost(): Promise<FullPost>;
    /**
     * Get comments for this post
     * @throws {Error} When comment retrieval fails or API is unavailable
     */
    comments(options?: {
        limit?: number;
    }): AsyncIterable<Comment>;
    /**
     * Like this post
     */
    like(): Promise<void>;
    /**
     * Add a comment to this post
     */
    addComment(_data: {
        body: string;
    }): Promise<Comment>;
}
/**
 * FullPost entity representing a Substack post with complete HTML content
 */
declare class FullPost implements Post {
    private readonly publicationClient;
    private readonly commentService;
    readonly id: number;
    readonly title: string;
    readonly subtitle: string;
    readonly body: string;
    readonly truncatedBody: string;
    readonly likesCount: number;
    readonly author: {
        id: number;
        name: string;
        handle: string;
        avatarUrl: string;
    };
    readonly publishedAt: Date;
    readonly htmlBody: string;
    readonly slug: string;
    readonly createdAt: Date;
    readonly reactions?: Record<string, number>;
    readonly restacks?: number;
    readonly postTags?: string[];
    readonly coverImage?: string;
    readonly url: string;
    constructor(rawData: SubstackFullPost, publicationClient: HttpClient, commentService: CommentService);
    /**
     * Get comments for this post
     * @throws {Error} When comment retrieval fails or API is unavailable
     */
    comments(options?: {
        limit?: number;
    }): AsyncIterable<Comment>;
    /**
     * Like this post
     */
    like(): Promise<void>;
    /**
     * Add a comment to this post
     */
    addComment(_data: {
        body: string;
    }): Promise<Comment>;
}

/**
 * Note entity representing a Substack note
 */
declare class Note {
    private readonly rawData;
    private readonly publicationClient;
    readonly id: string;
    readonly body: string;
    readonly likesCount: number;
    readonly author: {
        id: number;
        name: string;
        handle: string;
        avatarUrl: string;
    };
    readonly publishedAt: Date;
    constructor(rawData: SubstackNote, publicationClient: HttpClient);
    /**
     * Get parent comments for this note
     */
    comments(): AsyncIterable<Comment>;
    /**
     * Like this note
     */
    like(): Promise<void>;
    /**
     * Add a comment to this note
     */
    addComment(_text: string): Promise<Comment>;
}

/**
 * Base Profile class representing a Substack user profile (read-only)
 */
declare class Profile {
    protected readonly rawData: SubstackPublicProfile | SubstackFullProfile;
    protected readonly publicationClient: HttpClient;
    protected readonly profileService: ProfileService;
    protected readonly postService: PostService;
    protected readonly noteService: NoteService;
    protected readonly commentService: CommentService;
    protected readonly perPage: number;
    readonly id: number;
    readonly slug: string;
    readonly handle: string;
    readonly name: string;
    readonly url: string;
    readonly avatarUrl: string;
    readonly bio?: string;
    constructor(rawData: SubstackPublicProfile | SubstackFullProfile, publicationClient: HttpClient, profileService: ProfileService, postService: PostService, noteService: NoteService, commentService: CommentService, perPage: number, resolvedSlug?: string);
    /**
     * Get posts from this profile's publications
     */
    posts(options?: {
        limit?: number;
    }): AsyncIterable<PreviewPost>;
    /**
     * Get notes from this profile
     */
    notes(options?: {
        limit?: number;
    }): AsyncIterable<Note>;
}

/**
 * OwnProfile extends Profile with write capabilities for the authenticated user
 */
declare class OwnProfile extends Profile {
    private readonly followingService;
    private readonly newNoteService;
    constructor(rawData: SubstackFullProfile, publicationClient: HttpClient, profileService: ProfileService, postService: PostService, noteService: NoteService, commentService: CommentService, followingService: FollowingService, newNoteService: NewNoteService, perPage: number, resolvedSlug?: string);
    /**
     * Create a new note using the builder pattern
     */
    newNote(): NoteBuilder;
    /**
     * Create a new note with a link attachment using the builder pattern
     */
    newNoteWithLink(link: string): NoteWithLinkBuilder;
    /**
     * Get users that the authenticated user follows
     */
    following(options?: {
        limit?: number;
    }): AsyncIterable<Profile>;
    /**
     * Get notes from the authenticated user's profile
     */
    notes(options?: {
        limit?: number;
    }): AsyncIterable<Note>;
}

/**
 * Configuration interfaces for the Substack API client
 */
interface SubstackConfig {
    publicationUrl: string;
    token: string;
    substackUrl?: string;
    urlPrefix?: string;
    perPage?: number;
    maxRequestsPerSecond?: number;
}
interface PaginationParams {
    limit?: number;
    offset?: number;
}
interface SearchParams extends PaginationParams {
    query: string;
    sort?: 'top' | 'new';
    author?: string;
}

/**
 * Domain interfaces for iterator options and user-facing types
 */
interface PostsIteratorOptions {
    limit?: number;
}
interface CommentsIteratorOptions {
    postId?: number;
    limit?: number;
}
interface NotesIteratorOptions {
    limit?: number;
}

/**
 * Modern SubstackClient with entity-based API
 */
declare class SubstackClient {
    private readonly publicationClient;
    private readonly substackClient;
    private readonly postService;
    private readonly noteService;
    private readonly profileService;
    private readonly commentService;
    private readonly followingService;
    private readonly connectivityService;
    private readonly newNoteService;
    private readonly perPage;
    /**
     * Normalize URL by ensuring it has a protocol
     * If no protocol is specified, defaults to https://
     */
    private static normalizeUrl;
    constructor(config: SubstackConfig);
    /**
     * Test API connectivity
     */
    testConnectivity(): Promise<boolean>;
    /**
     * Get the authenticated user's own profile with write capabilities
     * @throws {Error} When authentication fails or user profile cannot be retrieved
     */
    ownProfile(): Promise<OwnProfile>;
    /**
     * Get a profile by handle/slug
     */
    profileForSlug(slug: string): Promise<Profile>;
    /**
     * Get a profile by user ID
     */
    profileForId(id: number): Promise<Profile>;
    /**
     * Get a specific post by ID
     */
    postForId(id: number): Promise<FullPost>;
    /**
     * Get a specific note by ID
     */
    noteForId(id: number): Promise<Note>;
    /**
     * Get a specific comment by ID
     */
    commentForId(id: number): Promise<Comment>;
}

export { Comment, FullPost, ListBuilder, ListItemBuilder, Note, NoteBuilder, NoteWithLinkBuilder, OwnProfile, ParagraphBuilder, PreviewPost, Profile, SubstackClient };
export type { CommentsIteratorOptions, List, ListItem, NotesIteratorOptions, PaginationParams, PostsIteratorOptions, SearchParams, SubstackConfig, TextSegment };
