import React from "react";
import {
  Post,
  PostSizes,
  FeedWithMenu,
  BoardSidebar,
  PostingActionButton,
  toast,
  // @ts-ignore
} from "@bobaboard/ui-components";
import Layout from "../../components/Layout";
import PostEditorModal from "../../components/PostEditorModal";
import { useInfiniteQuery, queryCache, useMutation } from "react-query";
import { useAuth } from "../../components/Auth";
import { useBoardTheme } from "../../components/BoardTheme";
import {
  getBoardActivityData,
  markThreadAsRead,
  muteThread,
  hideThread,
} from "../../utils/queries";
import { useRouter } from "next/router";
import axios from "axios";
import debug from "debug";
import moment from "moment";
import { BoardActivityResponse, ThreadType } from "../../types/Types";
import { createLinkTo, THREAD_URL_PATTERN } from "utils/link-utils";

const error = debug("bobafrontend:boardPage-error");
const log = debug("bobafrontend:boardPage-log");
const info = debug("bobafrontend:boardPage-info");
info.log = console.info.bind(console);

const MemoizedPost = React.memo(Post);

const removeThreadActivityFromCache = ({
  slug,
  threadId,
}: {
  slug: string;
  threadId: string;
}) => {
  const boardActivityData = queryCache.getQueryData<BoardActivityResponse[]>([
    "boardActivityData",
    { slug },
  ]);

  const updatedThread = boardActivityData
    ?.flatMap((data) => data.activity)
    .find((thread) => thread.threadId == threadId);

  if (!updatedThread) {
    error(
      `Thread wasn't found in data after marking thread ${threadId} as visited`
    );
    return;
  }
  updatedThread.posts[0].isNew = false;
  updatedThread.posts[0].newCommentsAmount = 0;
  updatedThread.posts[0].newPostsAmount = 0;
  updatedThread.isNew = false;
  updatedThread.newCommentsAmount = 0;
  updatedThread.newPostsAmount = 0;
  queryCache.setQueryData(
    ["boardActivityData", { slug }],
    () => boardActivityData
  );
};

const setThreadMutedInCache = ({
  slug,
  threadId,
  mute,
}: {
  slug: string;
  threadId: string;
  mute: boolean;
}) => {
  const boardActivityData = queryCache.getQueryData<BoardActivityResponse[]>([
    "boardActivityData",
    { slug },
  ]);

  const updatedThread = boardActivityData
    ?.flatMap((data) => data.activity)
    .find((thread) => thread.threadId == threadId);

  if (!updatedThread) {
    error(
      `Thread wasn't found in data after marking thread ${threadId} as muted`
    );
    return;
  }
  updatedThread.muted = mute;
  queryCache.setQueryData(
    ["boardActivityData", { slug }],
    () => boardActivityData
  );
};

const setThreadHiddenInCache = ({
  slug,
  threadId,
  hide,
}: {
  slug: string;
  threadId: string;
  hide: boolean;
}) => {
  const boardActivityData = queryCache.getQueryData<BoardActivityResponse[]>([
    "boardActivityData",
    { slug },
  ]);

  const updatedThread = boardActivityData
    ?.flatMap((data) => data.activity)
    .find((thread) => thread.threadId == threadId);

  if (!updatedThread) {
    error(
      `Thread wasn't found in data after marking thread ${threadId} as hidden`
    );
    return;
  }
  updatedThread.hidden = hide;
  queryCache.setQueryData(
    ["boardActivityData", { slug }],
    () => boardActivityData
  );
};

function BoardPage() {
  const [postEditorOpen, setPostEditorOpen] = React.useState(false);
  const [showSidebar, setShowSidebar] = React.useState(false);
  const router = useRouter();
  const slug: string = router.query.boardId?.slice(1) as string;
  const { isPending, isLoggedIn, user } = useAuth();
  const { [slug]: boardData } = useBoardTheme();
  const threadRedirectMethod = React.useRef(
    new Map<
      string,
      {
        href: string;
        onClick: () => void;
      }
    >()
  );

  const {
    data: boardActivityData,
    isFetching: isFetchingBoardActivity,
    isFetchingMore,
    fetchMore,
    canFetchMore,
  } = useInfiniteQuery(["boardActivityData", { slug }], getBoardActivityData, {
    getFetchMore: (lastGroup, allGroups) => {
      // TODO: if this method fires too often in a row, sometimes there's duplicate
      // values within allGroups (aka groups fetched with the same cursor).
      // This seems to be a library problem.
      return lastGroup?.nextPageCursor;
    },
  });

  const [readThread] = useMutation(
    (threadId: string) => markThreadAsRead({ threadId }),
    {
      onMutate: (threadId) => {
        log(`Optimistically marking thread ${threadId} as visited.`);
        removeThreadActivityFromCache({ slug, threadId });
      },
      onError: (error: Error, threadId) => {
        toast.error("Error while marking thread as visited");
        log(`Error while marking thread ${threadId} as visited:`);
        log(error);
      },
      onSuccess: (data: boolean, threadId) => {
        log(`Successfully marked thread ${threadId} as visited.`);
      },
    }
  );

  const [setThreadMuted] = useMutation(
    ({ threadId, mute }: { threadId: string; mute: boolean }) =>
      muteThread({ threadId, mute }),
    {
      onMutate: ({ threadId, mute }) => {
        log(
          `Optimistically marking thread ${threadId} as ${
            mute ? "muted" : "unmuted"
          }.`
        );
        setThreadMutedInCache({ slug, threadId, mute });
      },
      onError: (error: Error, { threadId, mute }) => {
        toast.error(
          `Error while marking thread as ${mute ? "muted" : "unmuted"}`
        );
        log(`Error while marking thread ${threadId} as muted:`);
        log(error);
      },
      onSuccess: (data: boolean, { threadId, mute }) => {
        log(
          `Successfully marked thread ${threadId} as  ${
            mute ? "muted" : "unmuted"
          }.`
        );
        queryCache.invalidateQueries("allBoardsData");
      },
    }
  );

  const [setThreadHidden] = useMutation(
    ({ threadId, hide }: { threadId: string; hide: boolean }) =>
      hideThread({ threadId, hide }),
    {
      onMutate: ({ threadId, hide }) => {
        log(
          `Optimistically marking thread ${threadId} as ${
            hide ? "hidden" : "visible"
          }.`
        );
        setThreadHiddenInCache({ slug, threadId, hide });
      },
      onError: (error: Error, { threadId, hide }) => {
        toast.error(
          `Error while marking thread as ${hide ? "hidden" : "visible"}`
        );
        log(`Error while marking thread ${threadId} as hidden:`);
        log(error);
      },
      onSuccess: (data: boolean, { threadId, hide }) => {
        log(
          `Successfully marked thread ${threadId} as  ${
            hide ? "hidden" : "visible"
          }.`
        );
        queryCache.invalidateQueries("allBoardsData");
      },
    }
  );

  React.useEffect(() => {
    if (!isPending && isLoggedIn) {
      log(`Marking board ${slug} as visited`);
      axios.get(`boards/${slug}/visit`);
    }
  }, [isPending, isLoggedIn, slug]);

  const getMemoizedRedirectMethod = (threadId: string) => {
    if (!threadRedirectMethod.current?.has(threadId)) {
      info(`Creating new handler for thread id: ${threadId}`);
      threadRedirectMethod.current?.set(
        threadId,
        createLinkTo({
          urlPattern: THREAD_URL_PATTERN,
          url: `/${router.query.boardId}/thread/${threadId}`,
        })
      );
    }
    info(`Returning handler for thread id: ${threadId}`);
    // This should never be null
    return threadRedirectMethod.current?.get(threadId) || (() => {});
  };

  const showEmptyMessage = boardActivityData?.[0]?.activity?.length === 0;

  return (
    <div className="main">
      {isLoggedIn && (
        <PostEditorModal
          isOpen={postEditorOpen}
          userIdentity={{
            name: user?.username,
            avatar: user?.avatarUrl,
          }}
          onPostSaved={(post: any) => {
            queryCache.invalidateQueries(["boardActivityData", { slug }]);
            setPostEditorOpen(false);
          }}
          onCloseModal={() => setPostEditorOpen(false)}
          slug={slug}
          replyToPostId={null}
          uploadBaseUrl={`images/${slug}/`}
        />
      )}
      <Layout
        mainContent={
          <FeedWithMenu
            onCloseSidebar={() => setShowSidebar(false)}
            showSidebar={showSidebar}
            sidebarContent={
              <>
                <BoardSidebar
                  board={
                    boardData || {
                      slug: slug,
                      avatarUrl: "/",
                      tagline: "loading...",
                      accentColor: "#f96680",
                    }
                  }
                />
                <img
                  className="under-construction"
                  src="/under_construction_icon.png"
                />
              </>
            }
            feedContent={
              <div className="main">
                {showEmptyMessage && (
                  <img className="empty" src={"/nothing.jpg"} />
                )}
                {boardActivityData &&
                  boardActivityData
                    .flatMap((activityData) => activityData?.activity)
                    .map((thread: ThreadType) => {
                      const post = thread.posts[0];
                      const hasReplies =
                        thread.totalPostsAmount > 1 ||
                        thread.totalCommentsAmount > 0;
                      const redirectMethod = getMemoizedRedirectMethod(
                        thread.threadId
                      );
                      const threadUrl = `/${router.query.boardId}/thread/${thread.threadId}`;
                      if (thread.hidden) {
                        return (
                          <div className="post hidden" key={thread.threadId}>
                            This thread was hidden{" "}
                            <a
                              href="#"
                              onClick={(e) => {
                                setThreadHidden({
                                  threadId: thread.threadId,
                                  hide: !thread.hidden,
                                });
                                e.preventDefault();
                              }}
                            >
                              [unhide]
                            </a>
                          </div>
                        );
                      }
                      // TODO: memoize whole div
                      return (
                        <div className="post" key={`${post.postId}_container`}>
                          <MemoizedPost
                            key={post.postId}
                            createdTime={`${moment
                              .utc(post.created)
                              .fromNow()}${
                              hasReplies
                                ? ` [updated: ${moment
                                    .utc(thread.lastActivity)
                                    .fromNow()}]`
                                : ""
                            }`}
                            createdTimeLink={createLinkTo({
                              urlPattern: THREAD_URL_PATTERN,
                              url: threadUrl,
                            })}
                            text={post.content}
                            tags={post.tags}
                            secretIdentity={post.secretIdentity}
                            userIdentity={post.userIdentity}
                            onNewContribution={redirectMethod}
                            onNewComment={redirectMethod}
                            size={
                              post?.options?.wide
                                ? PostSizes.WIDE
                                : PostSizes.REGULAR
                            }
                            newPost={isLoggedIn && !thread.muted && post.isNew}
                            newComments={
                              isLoggedIn &&
                              (thread.muted
                                ? undefined
                                : thread.newCommentsAmount)
                            }
                            newContributions={
                              isLoggedIn &&
                              (thread.muted
                                ? undefined
                                : thread.newPostsAmount - (post.isNew ? 1 : 0))
                            }
                            totalComments={thread.totalCommentsAmount}
                            // subtract 1 since posts_amount is the amount of posts total in the thread
                            // including the head one.-
                            totalContributions={thread.totalPostsAmount - 1}
                            directContributions={thread.directThreadsAmount}
                            notesLink={redirectMethod}
                            muted={isLoggedIn && thread.muted}
                            menuOptions={[
                              {
                                name: "Copy Link",
                                link: {
                                  onClick: () => {
                                    const tempInput = document.createElement(
                                      "input"
                                    );
                                    tempInput.value = new URL(
                                      threadUrl,
                                      window.location.origin
                                    ).toString();
                                    document.body.appendChild(tempInput);
                                    tempInput.select();
                                    document.execCommand("copy");
                                    document.body.removeChild(tempInput);
                                    toast.success("Link copied!");
                                  },
                                },
                              },
                              // Add options just for logged in users
                              ...(isLoggedIn
                                ? [
                                    {
                                      name: "Mark Visited",
                                      link: {
                                        onClick: () => {
                                          readThread(thread.threadId);
                                        },
                                      },
                                    },
                                    {
                                      name: thread.muted ? "Unmute" : "Mute",
                                      link: {
                                        onClick: () => {
                                          setThreadMuted({
                                            threadId: thread.threadId,
                                            mute: !thread.muted,
                                          });
                                        },
                                      },
                                    },
                                    {
                                      name: thread.hidden ? "Unhide" : "Hide",
                                      link: {
                                        onClick: () => {
                                          setThreadHidden({
                                            threadId: thread.threadId,
                                            hide: !thread.hidden,
                                          });
                                        },
                                      },
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </div>
                      );
                    })}
                <div className="loading">
                  {!showEmptyMessage &&
                    boardActivityData?.length &&
                    (isFetchingMore
                      ? "Loading more..."
                      : canFetchMore
                      ? "..."
                      : "Nothing more to load")}
                </div>
              </div>
            }
            onReachEnd={() => {
              info(`Attempting to fetch more...`);
              info(canFetchMore);
              if (canFetchMore && !isFetchingMore) {
                info(`...found stuff!`);
                fetchMore();
                return;
              }
              info(
                isFetchingMore
                  ? `...but we're already fetching`
                  : `...but there's nothing!`
              );
            }}
          />
        }
        actionButton={
          isLoggedIn && (
            <PostingActionButton
              accentColor={boardData?.accentColor || "#f96680"}
              onNewPost={() => setPostEditorOpen(true)}
            />
          )
        }
        title={`!${slug}`}
        onTitleClick={() => setShowSidebar(!showSidebar)}
        forceHideTitle={true}
        loading={isFetchingBoardActivity}
      />
      <style jsx>{`
        .main {
          width: 100%;
        }
        .post.hidden {
          max-width: 500px;
          width: calc(100% - 40px);
          background-color: gray;
          padding: 20px;
          border: 1px dashed black;
          border-radius: 15px;
        }
        .post {
          margin: 20px auto;
          width: 100%;
        }
        .post > :global(div) {
          margin: 0 auto;
        }
        .empty {
          margin: 0 auto;
          display: block;
          margin-top: 30px;
          filter: grayscale(0.4);
          max-width: 100%;
        }
        .loading {
          text-align: center;
          margin-bottom: 20px;
          color: white;
        }
        .under-construction {
          width: 50px;
          margin: 0 auto;
          display: block;
          margin-top: -20px;
          opacity: 0.5;
          filter: grayscale(0.4);
        }
      `}</style>
    </div>
  );
}

export default BoardPage;
