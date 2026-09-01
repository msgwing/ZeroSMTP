# A container for the MCP server, for the places that will only take one.
#
# Two of them, both measured 2026-08-31:
#
#   * Glama gates listing on `awesome-mcp-servers` (93,592 stars) behind a
#     Dockerfile and an introspection check - their bot said so on our own
#     pull request #13311. No image, no listing.
#   * `docker/mcp-registry` was checked the same day and rejected us for
#     exactly this: its CONTRIBUTING.md needs either a Dockerfile in the
#     source repository or a public HTTPS endpoint, and `grep -i "npx"`
#     over it returns nothing. Publishing to npm was not enough there.
#
# So this file is not packaging for its own sake - it is the entry ticket to
# two venues that npm alone cannot open.
#
# Deliberately not `node:22`: the server has no dependencies at all, so the
# only thing an image needs to carry is a Node runtime and four files. Alpine
# keeps that honest and small, and `npm install` is absent on purpose - there
# is nothing to install, and a lockfile-less `npm install` in a build is how a
# zero-dependency package quietly stops being one.

FROM node:22-alpine

# `stdio` is the only transport this server speaks, so there is no port to
# expose and no health endpoint to add. The check any registry runs is an
# MCP introspection request over stdin, which is what CMD below answers.
WORKDIR /app

# Copied one by one rather than `COPY . .`, so a stray test fixture or a
# scratch file cannot end up in a published image. Same list as the `files`
# array in package.json, which is what npm ships.
COPY package.json ./
COPY index.js ./
COPY data/ ./data/
COPY README.md ./

# Runs as a non-root user. `node` (uid 1000) already exists in this image, so
# this costs nothing and means a registry that inspects the image does not
# have to take our word for it.
USER node

ENTRYPOINT ["node", "/app/index.js"]
