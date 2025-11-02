export enum QUERY_PARAM {
	PAGE = 'page',
	SEARCH = 'search',
	PAGE_SIZE = 'size',
	START_DATE = 'start_date',
	END_DATE = 'end_date',
	STATUS = 'status',
	SORT_BY = 'sortBy',
	SORT_FIELD = 'sort_field',
	SORT_DIRECTION = 'sort_direction',
}

export const DEFAULT_QUERY_VALUE = {
	SEARCH: '',
	PAGE: 1,
};
