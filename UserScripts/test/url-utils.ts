import IvUrlExtractor from "../src/controllers/invidious/url-extractor";

const urlExtractor = new IvUrlExtractor();

describe("url-utils", () => {
    describe("channelId", () => {
        it("should extract the id from a simple path", () => {
            const expectedId = "ABCD";
            const id = urlExtractor.channelId(`/channel/${expectedId}`);
            expect(id).toBe(expectedId);
        });

        it("should extract the id from a path with more subpaths", () => {
            const expectedId = "ABCD";
            const id = urlExtractor.channelId(`/channel/${expectedId}/playlists`);
            expect(id).toBe(expectedId);
        });

        it("should extract the id from a path with query", () => {
            const expectedId = "ABCD";
            const id = urlExtractor.channelId(`/channel/${expectedId}?a=b`);
            expect(id).toBe(expectedId);
        });

        it("should extract the id from a path with more subpaths and query", () => {
            const expectedId = "ABCD";
            const id = urlExtractor.channelId(`/channel/${expectedId}/playlists?a=b`);
            expect(id).toBe(expectedId);
        });
    });

    describe("playlistId", () => {
        it("should extract id from watch path", () => {
            const expectedId = "ABCD";
            const id = urlExtractor.playlistId(`/watch?v=vid_id&list=${expectedId}`);
            expect(id).toBe(expectedId);
        });

        it("should extract id from playlist path", () => {
            const expectedId = "ABCD";
            const id = urlExtractor.playlistId(`/playlist?list=${expectedId}`);
            expect(id).toBe(expectedId);
        });

        it("should return null on unrelated path", () => {
            const id = urlExtractor.playlistId("/path?v=vid_id&list=ABCD");
            expect(id).toBeNull();
        });
    });
});
