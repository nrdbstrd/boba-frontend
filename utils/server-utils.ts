import { PostType, CommentType, ThreadType, BoardData } from "../types/Types";

import { DEFAULT_USER_NAME, DEFAULT_USER_AVATAR } from "../components/Auth";
import { NextPageContext } from "next/dist/next-server/lib/utils";
import moment from "moment";

export const makeClientComment = (
  serverComment: any,
  parentPostId: string
): CommentType => ({
  commentId: serverComment.comment_id,
  chainParentId: serverComment.chain_parent_id,
  parentCommentId: serverComment.parent_comment,
  parentPostId,
  secretIdentity: {
    name: serverComment.secret_identity.name,
    avatar: serverComment.secret_identity.avatar,
  },
  userIdentity: serverComment.user_identity && {
    name: serverComment.user_identity.name || DEFAULT_USER_NAME,
    avatar: serverComment.user_identity.avatar || DEFAULT_USER_AVATAR,
  },
  accessory: serverComment.accessory_avatar,
  created: serverComment.created,
  content: serverComment.content,
  isNew: serverComment.is_new,
  isOwn: serverComment.is_own,
});

export const makeClientPost = (serverPost: any): PostType => ({
  postId: serverPost.post_id,
  threadId: serverPost.parent_thread_id,
  parentPostId: serverPost.parent_post_id,
  secretIdentity: {
    name: serverPost.secret_identity.name,
    avatar: serverPost.secret_identity.avatar,
  },
  userIdentity: serverPost.user_identity && {
    name: serverPost.user_identity.name || DEFAULT_USER_NAME,
    avatar: serverPost.user_identity.avatar || DEFAULT_USER_AVATAR,
  },
  accessory: serverPost.accessory_avatar,
  created: serverPost.created,
  content: serverPost.content,
  options: {
    wide: serverPost.options?.wide,
  },
  tags: {
    whisperTags: serverPost.tags.whisper_tags,
    indexTags: serverPost.tags.index_tags,
    categoryTags: serverPost.tags.category_tags,
    contentWarnings: serverPost.tags.content_warnings,
  },
  comments: serverPost.comments?.map((comment: any) =>
    makeClientComment(comment, serverPost.post_id)
  ),
  postsAmount: serverPost.posts_amount,
  threadsAmount: serverPost.threads_amount,
  newPostsAmount: serverPost.new_posts_amount,
  newCommentsAmount: serverPost.new_comments_amount,
  isNew: serverPost.is_new,
  isOwn: serverPost.self,
  commentsAmount: serverPost.comments_amount,
});

export const makeClientThread = (serverThread: any): ThreadType => {
  const clientPosts: PostType[] = serverThread.posts.map(makeClientPost);
  let personalIdentity = clientPosts.find((post) => post.isOwn)?.secretIdentity;
  if (!personalIdentity) {
    // Look for it within comments.
    personalIdentity = clientPosts
      .flatMap((post) => post.comments)
      .find((comment) => comment?.isOwn)?.secretIdentity;
  }
  return {
    posts: clientPosts,
    isNew: serverThread.posts[0].is_new,
    threadId: serverThread.thread_id,
    boardSlug: serverThread.board_slug,
    newPostsAmount: serverThread.thread_new_posts_amount,
    newCommentsAmount: serverThread.thread_new_comments_amount,
    totalCommentsAmount: serverThread.thread_total_comments_amount,
    totalPostsAmount: serverThread.thread_total_posts_amount,
    directThreadsAmount: serverThread.thread_direct_threads_amount,
    lastActivity: serverThread.thread_last_activity,
    muted: serverThread.muted,
    hidden: serverThread.hidden,
    defaultView: serverThread.default_view,
    personalIdentity: personalIdentity,
  };
};

export const makeClientBoardData = (serverBoardData: any): BoardData => {
  let lastUpdate = null;
  if (serverBoardData.last_post) {
    lastUpdate = moment.utc(serverBoardData.last_post);
  }
  if (serverBoardData.last_comment) {
    const commentUpdate = moment.utc(serverBoardData.last_comment);
    lastUpdate = lastUpdate
      ? moment.max(lastUpdate, commentUpdate)
      : moment.utc(commentUpdate);
  }
  return {
    slug: serverBoardData.slug,
    avatarUrl: serverBoardData.avatarUrl,
    tagline: serverBoardData.tagline,
    accentColor: serverBoardData.settings?.accentColor,
    loggedInOnly: serverBoardData.loggedInOnly,
    delisted: serverBoardData.delisted,
    lastUpdate: lastUpdate ? lastUpdate.toDate() : undefined,
    lastUpdateFromOthers: serverBoardData.last_activity_from_others
      ? moment.utc(serverBoardData.last_activity_from_others).toDate()
      : undefined,
    lastVisit: serverBoardData.last_visit
      ? moment.utc(serverBoardData.last_visit).toDate()
      : undefined,
    descriptions: serverBoardData.descriptions || [],
    hasUpdates: serverBoardData.has_updates,
    muted: serverBoardData.muted,
    pinnedOrder: serverBoardData.pinned_order
      ? parseInt(serverBoardData.pinned_order)
      : null,
    postingIdentities: serverBoardData.postingIdentities,
    permissions: serverBoardData.permissions,
  };
};

export const getCurrentHost = (
  context: NextPageContext | undefined,
  withPort?: boolean
) => {
  const serverHost = context?.req?.headers.host;
  return typeof window !== "undefined"
    ? window.location.hostname
    : serverHost?.substr(
        0,
        withPort || serverHost?.indexOf(":") == -1
          ? undefined
          : serverHost?.indexOf(":")
      );
};

const SANDBOX_LOCATIONS = ["tys-sandbox.boba.social"];
export const isSandbox = (context: NextPageContext | undefined) => {
  if (process.env.NEXT_PUBLIC_TEST_SANDBOX === "true") {
    return true;
  }
  const currentHost = getCurrentHost(context);
  return currentHost && SANDBOX_LOCATIONS.includes(currentHost);
};

const ALLOWED_SANDBOX_LOCATIONS = {
  ["localhost"]: [
    "/!gore/thread/8b2646af-2778-487e-8e44-7ae530c2549c",
    "/!anime/thread/b27710a8-0a9f-4c09-b3a5-54668bab7051",
  ],
  "tys-sandbox.boba.social": [
    "/!challenge/thread/659dc185-b10d-4dbb-84c5-641fc1a65e58",
    "/!steamy/thread/9719a1dd-96da-497e-bd71-21634c20416c",
  ],
};
export const isAllowedSandboxLocation = (
  context: NextPageContext | undefined
) => {
  if (
    !context ||
    !context.asPath ||
    !isSandbox(context) ||
    !getCurrentHost(context)
  ) {
    return true;
  }
  const currentHost = getCurrentHost(context)!;
  return ALLOWED_SANDBOX_LOCATIONS[currentHost].includes(context.asPath);
};

export const getRedirectToSandboxLocation = (
  context?: NextPageContext | undefined
) => {
  const currentHost = getCurrentHost(context);
  if (!currentHost || !isSandbox(context)) {
    throw new Error(
      "No valid current host in sandbox location, or tried sandbox redirect in non-sandbox environment."
    );
  }
  return ALLOWED_SANDBOX_LOCATIONS[currentHost][0];
};

export const isStaging = () => {
  if (typeof window === "undefined") {
    return false;
  }
  return window.location.hostname.startsWith("staging");
};

export const getServerBaseUrl = (context?: NextPageContext) => {
  let location = "";
  let isStaging = false;
  let isLocalhost = false;

  const currentHost =
    typeof window !== "undefined"
      ? window.location.hostname
      : context?.req?.headers.host;
  if (currentHost?.startsWith("localhost") || currentHost?.startsWith("192.")) {
    location = currentHost;
    isLocalhost = true;
  } else if (currentHost?.startsWith("staging")) {
    location = `staging-dot-backend-dot-bobaboard.uc.r.appspot.com`;
    isStaging = true;
  } else {
    location = "backend-dot-bobaboard.uc.r.appspot.com";
  }

  // Remove the port if there is currently one
  if (location.indexOf(":") != -1) {
    location = location.substring(0, location.indexOf(":"));
  }

  const DEV_SERVER_KEY = "devServer";
  let devServer = isLocalhost
    ? `http://${location}:4200/`
    : `https://${location}/`;
  // TODO: this might cause problems with SSR now. A better way of doing this
  // would be to set it as a cookie so that it can be sent to the server as a
  // setting.
  if (typeof localStorage !== "undefined") {
    const data = localStorage.getItem(DEV_SERVER_KEY);
    if (data) {
      devServer = data;
    }
  }
  if (process.env.NEXT_PUBLIC_DEFAULT_BACKEND) {
    devServer = process.env.NEXT_PUBLIC_DEFAULT_BACKEND;
  }
  return process.env.NODE_ENV == "production"
    ? isStaging
      ? "https://staging-dot-backend-dot-bobaboard.uc.r.appspot.com/"
      : "https://backend-dot-bobaboard.uc.r.appspot.com/"
    : devServer;
};
