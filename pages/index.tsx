import React from "react";
import Layout from "../components/Layout";
import { getAllBoardsData, ALL_BOARDS_KEY } from "./../utils/queries";
import { useQuery } from "react-query";
// @ts-ignore
import { BoardsDisplay, useCompact } from "@bobaboard/ui-components";
import Link from "next/link";
import debug from "debug";
import { BOARD_URL_PATTERN, createLinkTo } from "utils/link-utils";

const info = debug("bobafrontend:index-info");

function HomePage() {
  const { data: allBoards } = useQuery("allBoardsData", getAllBoardsData, {
    initialData: () => {
      if (typeof localStorage === "undefined") {
        return undefined;
      }
      // Localstorage is a client-only feature
      const data = localStorage.getItem(ALL_BOARDS_KEY);
      if (!data) {
        return undefined;
      }
      const boardData = JSON.parse(data);
      if (!boardData.forEach) {
        // Something weird got saved here!
        return undefined;
      }
      boardData.forEach((board: any) => (board.has_updates = false));
      return boardData;
    },
    initialStale: true,
  });

  info(`Rerendering index with data:`);
  info(allBoards);
  return (
    <div className="main">
      <Layout
        mainContent={
          <div className="content">
            <div className="intro">
              <h1>Welcome to BobaBoard!</h1>
              <div className="tagline">
                "Where the bugs are funny and the people are cool" — Outdated
                Meme
              </div>
              <img src="/under_construction.gif" />
              <p>
                Remember: this is the experimental version of an experimental
                website. If you experience a problem, then stuff is likely to be{" "}
                <em>actually broken</em>.
              </p>
              <p>
                Please do report bugs, thoughts and praise (seriously, gotta
                know what's working) in the{" "}
                <pre style={{ display: "inline" }}>#v0-report</pre> discord
                channel or the{" "}
                <pre style={{ display: "inline" }}>!bobaland</pre> board.
              </p>
              <div className="updates">
                <h2>New Stuff </h2>
                <div className="last">
                  [Last Updated: 10/07/20.{" "}
                  <Link href="/update-logs">
                    <a>Older logs.</a>
                  </Link>
                  ]
                  <p>
                    Small improvements all around:
                    <ul>
                      <li>
                        You can now mark tweets (and only tweets) as spoilers.
                        That kinda came for free with next update, which is....
                      </li>
                      <li>
                        You can now select whether you want the full tweet
                        thread or the single tweet when embedding one.
                      </li>
                      <li>
                        Last, if a board has specific categories, these will
                        appear as suggestions when adding one to your thread.
                      </li>
                      <li>
                        [Bug Fixes] fixed problem where board wouldn't get
                        updated until refresh when hiding/muting threads; fixed
                        problems with last bulletpoint of list losing
                        formatting.
                      </li>
                      <li>
                        [Restyling] the editor formatting options should now
                        look nicer on really tiny screens; please behold our
                        new, beautiful tag input & display.
                      </li>
                    </ul>
                  </p>
                </div>
              </div>
            </div>
            <div className="display">
              <BoardsDisplay
                boards={(allBoards || []).map((board: any) => ({
                  slug: board.slug.replace("_", " "),
                  avatar: board.avatarUrl,
                  description: board.tagline,
                  color: board.settings?.accentColor,
                  updates: board.has_updates,
                  link: createLinkTo({
                    urlPattern: BOARD_URL_PATTERN,
                    url: `/!${board.slug.replace(" ", "_")}`,
                  }),
                }))}
                minSizePx={180}
              />
            </div>
            <style jsx>{`
              .intro {
                max-width: 600px;
                margin: 0 auto;
                margin-bottom: 25px;
                line-height: 20px;
              }
              a {
                color: #f96680;
              }
              .tagline {
                font-style: italic;
                opacity: 0.9;
                margin-top: -10px;
                margin-bottom: 15px;
              }
              .intro img {
                height: 100px;
              }
              .updates {
                background-color: #1c1c1c;
                padding: 15px;
                border-radius: 25px;
                position: relative;
              }
              .updates .last {
                font-size: small;
                margin-bottom: 5px;
              }
              .updates :global(.expand-overlay) :global(svg) {
                margin-top: 15px;
              }
              .intro ul {
                list-style-position: inside;
                list-style-type: lower-greek;
                padding-left: 0px;
              }
              .intro ul ul {
                padding-left: 10px;
                list-style-type: circle;
              }
              .intro ul ul li {
                padding-bottom: 5px;
              }
              .intro ul li {
                padding-bottom: 10px;
              }
              .content {
                color: white;
                text-align: center;
                margin: 0 auto;
                padding: 20px;
              }
              .display {
                max-width: 800px;
                width: 90%;
                margin: 0 auto;
              }
            `}</style>
          </div>
        }
        title={`Hello!`}
      />
    </div>
  );
}

export default HomePage;
