import { withAuthenticatedClientRequest } from "@api/requestBuilder/client/withClientRequest";
import {
	createBlog,
	deleteBlog,
	getBlog,
	getBlogs,
	updateBlog,
} from "./requests";

const blogsClientRequests = {
	getBlogs: withAuthenticatedClientRequest(getBlogs),
	getBlog: withAuthenticatedClientRequest(getBlog),
	createBlog: withAuthenticatedClientRequest(createBlog),
	updateBlog: withAuthenticatedClientRequest(updateBlog),
	deleteBlog: withAuthenticatedClientRequest(deleteBlog),
};

export default blogsClientRequests;
