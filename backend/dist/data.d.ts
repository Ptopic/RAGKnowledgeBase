declare const _default: ({
    url: string;
    title: string;
    youtuber: string;
    youtuber_md5: string;
    video_url: string;
    video_length: number;
    likes: number;
    views: number;
    date_posted: string;
    description: string;
    num_comments: number;
    subscribers: number;
    music: {
        song: string;
        artist: string;
    };
    video_id: string;
    channel_url: string;
    preview_image: string;
    shortcode: string;
    verified: boolean;
    handle_name: string;
    avatar_img_channel: string;
    related_videos: any;
    license: any;
    viewport_frames: string;
    current_optimal_res: string;
    codecs: string;
    color: string;
    quality: string;
    quality_label: string;
    post_type: string;
    youtuber_id: string;
    transcript: any;
    formatted_transcript: any;
    hashtags: {
        hashtag: string;
        link: string;
    }[];
    tags: string[];
    next_recommended_videos: {
        url: string;
        title: string;
        thumbnail: string;
        startMs: number;
        endMs: number;
        style: string;
    }[];
    recommended_videos: {
        url: string;
        title: string;
        thumbnail: string;
    }[];
    transcript_language: any[];
    chapters: any;
    transcription_language: any;
    timestamp: string;
    input: {
        url: string;
        country: string;
        transcription_language: string;
    };
} | {
    url: string;
    title: string;
    youtuber: string;
    youtuber_md5: string;
    video_url: string;
    video_length: number;
    likes: number;
    views: number;
    date_posted: string;
    description: string;
    num_comments: number;
    subscribers: number;
    video_id: string;
    channel_url: string;
    preview_image: string;
    shortcode: string;
    verified: boolean;
    handle_name: string;
    avatar_img_channel: string;
    related_videos: any;
    license: any;
    viewport_frames: string;
    current_optimal_res: string;
    codecs: string;
    color: string;
    quality: string;
    quality_label: string;
    post_type: string;
    youtuber_id: string;
    transcript: string;
    formatted_transcript: {
        start_time: number;
        end_time: number;
        duration: number;
        text: string;
    }[];
    hashtags: any;
    tags: string[];
    next_recommended_videos: {
        url: string;
        title: string;
        thumbnail: string;
        startMs: number;
        endMs: number;
        style: string;
    }[];
    recommended_videos: {
        url: string;
        title: string;
        thumbnail: string;
    }[];
    transcript_language: {
        language: string;
        auto_translate: boolean;
    }[];
    chapters: {
        title: string;
        time_stamp: string;
        image: string;
    }[];
    transcription_language: any;
    timestamp: string;
    input: {
        url: string;
        country: string;
        transcription_language: string;
    };
    music?: undefined;
})[];
export default _default;
