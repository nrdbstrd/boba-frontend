import {
  getThreadData,
  hideThread,
  markThreadAsRead,
  muteThread,
} from "utils/queries/thread";
import {
  getThreadInCache,
  getThreadSummaryInCache,
  setThreadActivityClearedInCache,
  setThreadDefaultViewInCache,
  setThreadHiddenInCache,
  setThreadMutedInCache,
} from "../cache/thread";
import { useMutation, useQuery, useQueryClient } from "react-query";

import { ThreadType } from "types/Types";
import debug from "debug";
import { toast } from "@bobaboard/ui-components";
import { updateThreadView } from "utils/queries/thread";
import { useAuth } from "components/Auth";

const info = debug("bobafrontend:hooks:queries:thread-info");
const error = debug("bobafrontend:hooks:queries:thread-error");
const log = debug("bobafrontend:hooks:queries:thread-log");

export const THREAD_QUERY_KEY = "threadData";

export const useMuteThread = () => {
  const queryClient = useQueryClient();
  const { mutate: setThreadMuted } = useMutation(
    ({
      threadId,
      mute,
    }: {
      threadId: string;
      mute: boolean;
      boardId: string;
    }) => muteThread({ threadId, mute }),
    {
      onMutate: ({ threadId, mute, boardId }) => {
        log(
          `Optimistically marking thread ${threadId} as ${
            mute ? "muted" : "unmuted"
          }.`
        );
        setThreadMutedInCache(queryClient, {
          boardId,
          threadId,
          mute,
        });
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
        queryClient.invalidateQueries("allBoardsData");
      },
    }
  );

  return setThreadMuted;
};

export const useSetThreadView = () => {
  const queryClient = useQueryClient();
  const { mutate: setThreadView } = useMutation(
    ({
      threadId,
      view,
    }: {
      threadId: string;
      view: ThreadType["defaultView"];
      boardId: string;
    }) => updateThreadView({ threadId, view }),
    {
      onMutate: ({ threadId, view, boardId }) => {
        log(
          `Optimistically switched thread ${threadId} to default view ${view}.`
        );
        setThreadDefaultViewInCache(queryClient, {
          boardId,
          categoryFilter: null,
          threadId,
          view,
        });
        toast.success("Thread view updated!");
      },
      onError: (error: Error, { threadId, view }) => {
        toast.error(
          `Error while switching thread ${threadId} to default view ${view}.`
        );
        log(error);
      },
      onSuccess: (_, { threadId, view }) => {
        log(
          `Successfully switched thread ${threadId} to default view ${view}.`
        );
      },
    }
  );

  return setThreadView;
};

export const useSetThreadHidden = () => {
  const queryClient = useQueryClient();
  const { mutate: setThreadHidden } = useMutation(
    ({
      threadId,
      hide,
    }: {
      threadId: string;
      hide: boolean;
      boardId: string;
    }) => hideThread({ threadId, hide }),
    {
      onMutate: ({ threadId, hide, boardId }) => {
        log(
          `Optimistically marking thread ${threadId} as ${
            hide ? "hidden" : "visible"
          }.`
        );
        setThreadHiddenInCache(queryClient, {
          boardId,
          threadId,
          hide,
        });
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
        queryClient.invalidateQueries("allBoardsData");
      },
    }
  );
  return setThreadHidden;
};

export const useReadThread = (args?: { activityOnly?: boolean }) => {
  const queryClient = useQueryClient();
  const { isLoggedIn } = useAuth();
  // Mark thread as read on authentication and thread fetch
  const { mutate: readThread } = useMutation(
    ({ threadId }: { threadId: string; boardId: string }) => {
      if (!isLoggedIn) {
        throw new Error("Attempt to read thread with no user logged in.");
      }
      if (!threadId) {
        return Promise.resolve(false);
      }
      return markThreadAsRead({ threadId });
    },
    {
      onMutate: ({ threadId, boardId }) => {
        if (!threadId || !boardId) {
          return;
        }
        log(`Optimistically marking thread ${threadId} as visited.`);
        setThreadActivityClearedInCache(
          queryClient,
          {
            boardId,
            threadId,
          },
          {
            activityOnly: args?.activityOnly,
          }
        );
      },
      onError: (serverError: Error, threadId) => {
        toast.error("Error while marking thread as visited");
        error(`Error while marking thread ${threadId} as visited:`);
        error(serverError);
      },
      onSuccess: (data: boolean, { threadId }) => {
        log(`Successfully marked thread ${threadId} as visited.`);
      },
    }
  );

  return readThread;
};

export const useThread = ({
  threadId,
  boardId,
  fetch,
}: {
  threadId: string | null;
  boardId: string | null;
  fetch?: boolean;
}) => {
  const queryClient = useQueryClient();
  const { isLoggedIn } = useAuth();

  const { data, isLoading, isFetching } = useQuery<
    ThreadType | null,
    [
      string,
      {
        threadId: string;
      }
    ]
  >(
    [THREAD_QUERY_KEY, { threadId, isLoggedIn }],
    () => {
      if (!threadId) {
        return null;
      }
      log(`Fetcing thread with id ${threadId}.`);
      return getThreadData({ threadId });
    },

    {
      refetchOnWindowFocus: false,
      // NOTE: this only refetches on mount if the data is stale, which will happen
      // after all consumers are unmounted, or when the data is manually invalidated.
      refetchOnMount: true,
      // Never cache thread data. We never want to return old data for threads.
      cacheTime: 0,
      placeholderData: () => {
        if (!threadId) {
          return null;
        }
        info(
          `Searching board activity data for board ${boardId} and thread ${threadId}`
        );
        const cachedThread = getThreadInCache(queryClient, { threadId });
        if (cachedThread) {
          return cachedThread;
        }
        if (!boardId) {
          return null;
        }
        const thread = getThreadSummaryInCache(queryClient, {
          boardId,
          threadId,
        });
        info(`...${thread ? "found" : "NOT found"}!`);
        return thread
          ? { ...thread, posts: [thread?.starter], comments: {} }
          : undefined;
      },
      // When a thread is mounted, never automatically refetch it. We don't want
      // the data to change while the user is viewing it.
      staleTime: Infinity,
      notifyOnChangeProps: ["data", "isLoading", "isFetching"],
      enabled: !!(fetch ?? true) && !!threadId,
      onSuccess: (data) => {
        log(`Retrieved thread data for thread with id ${threadId}`);
        info(data);
      },
    }
  );

  return { data, isLoading, isFetching };
};
