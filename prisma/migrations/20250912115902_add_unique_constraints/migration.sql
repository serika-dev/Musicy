/*
  Warnings:

  - A unique constraint covering the columns `[title,artistId]` on the table `albums` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[title,artistId]` on the table `tracks` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "albums_title_artistId_key" ON "public"."albums"("title", "artistId");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_title_artistId_key" ON "public"."tracks"("title", "artistId");
