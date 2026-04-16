// @ts-check

import { retryer } from "../common/retryer.js";
import { logger } from "../common/log.js";
import { CustomError, MissingParamError } from "../common/error.js";
import { request } from "../common/http.js";

const BYTES_PER_LINE = {
  Kotlin: 35, Java: 38, Python: 30, Dart: 34, JavaScript: 32,
  TypeScript: 34, "C++": 36, C: 32, Go: 28, Rust: 34,
  HTML: 45, CSS: 30, SCSS: 28, Shell: 25, Ruby: 28,
  PHP: 32, Swift: 34, Lua: 26, R: 28, CMake: 30,
  Makefile: 25, Dockerfile: 22, YAML: 28, JSON: 30,
  XML: 50, Markdown: 40, "Jupyter Notebook": 50,
  "Objective-C": 36, Haskell: 30, Scala: 34, Perl: 30,
  PowerShell: 32, Batchfile: 28, AIDL: 34, PLpgSQL: 35,
};
const DEFAULT_BPL = 32;

/**
 * GraphQL fetcher for user repositories and language byte sizes.
 */
const fetcher = (variables, token) => {
  return request(
    {
      query: `
      query userInfo($login: String!) {
        user(login: $login) {
          repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
            totalCount
            nodes {
              name
              languages(first: 20, orderBy: {field: SIZE, direction: DESC}) {
                edges {
                  size
                  node {
                    color
                    name
                  }
                }
              }
            }
          }
        }
      }
      `,
      variables,
    },
    {
      Authorization: `token ${token}`,
    },
  );
};

/**
 * Fetch LOC data for a given username.
 *
 * @param {string} username GitHub username.
 */
const fetchLOCStats = async (username) => {
  if (!username) {
    throw new MissingParamError(["username"]);
  }

  const res = await retryer(fetcher, { login: username });

  if (res.data.errors) {
    logger.error(res.data.errors);
    if (res.data.errors[0].type === "NOT_FOUND") {
      throw new CustomError(
        res.data.errors[0].message || "Could not fetch user.",
        CustomError.USER_NOT_FOUND,
      );
    }
    throw new CustomError(
      res.data.errors[0].message || "Something went wrong while retrieving LOC data.",
      CustomError.GRAPHQL_ERROR,
    );
  }

  const user = res.data.data.user;
  if (!user) {
    throw new CustomError("User not found.", CustomError.USER_NOT_FOUND);
  }

  const repoNodes = user.repositories.nodes || [];
  const repoCount = user.repositories.totalCount || repoNodes.length;

  /** @type {Record<string, { name: string, color: string, bytes: number, loc: number }>} */
  const langMap = {};

  for (const repo of repoNodes) {
    if (!repo.languages || !repo.languages.edges) continue;
    for (const edge of repo.languages.edges) {
      const { name, color } = edge.node;
      const bytes = edge.size;
      const bpl = BYTES_PER_LINE[name] || DEFAULT_BPL;
      const loc = Math.floor(bytes / bpl);

      if (!langMap[name]) {
        langMap[name] = { name, color: color || "#858585", bytes: 0, loc: 0 };
      }
      langMap[name].bytes += bytes;
      langMap[name].loc += loc;
    }
  }

  const languages = Object.values(langMap).sort((a, b) => b.loc - a.loc);
  const totalLoc = languages.reduce((acc, curr) => acc + curr.loc, 0);

  return {
    totalLoc,
    repoCount,
    languages,
  };
};

export { fetchLOCStats };
export default fetchLOCStats;
