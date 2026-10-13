/**
 * Typen der build-zeit-artefakte aus `snapshot/output/`, wie sie die
 * SPA ueber `/snapshot-data/*.json` konsumiert. Quelle der wahrheit fuer
 * die JSON-form ist `snapshot/src/core/output.ts` bzw. `post-json.ts`.
 */

export interface CoverImage {
	url: string;
	alt?: string;
	width?: number;
	height?: number;
	mime?: string;
}

export interface TranslationRef {
	lang: string;
	slug: string;
	title: string;
}

export interface ProfileJson {
	name?: string;
	display_name?: string;
	about?: string;
	website?: string;
	picture?: string;
	nip05?: string;
}

/** Listen-eintrag (startseite, archiv, tag-seiten). */
export interface PostSummary {
	slug: string;
	lang: string;
	created_at: number;
	published_at: number;
	title: string;
	summary: string;
	cover_image: CoverImage | null;
	tags: string[];
}

/** `/snapshot-data/index.json` */
export interface SnapshotIndex {
	generated_at: string;
	profile: ProfileJson | null;
	/** Neueste zuerst (published_at absteigend). */
	posts: PostSummary[];
}

/** `/snapshot-data/posts/<slug>.json` — ohne markdown, mit fertigem HTML. */
export interface PostJson extends PostSummary {
	event_id: string;
	content_html: string;
	naddr: string;
	habla_url: string;
	translations: TranslationRef[];
}
