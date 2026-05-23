-- CreateTable
CREATE TABLE "_UserHiddenDisciplines" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserHiddenDisciplines_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserHiddenDisciplines_B_index" ON "_UserHiddenDisciplines"("B");

-- AddForeignKey
ALTER TABLE "_UserHiddenDisciplines" ADD CONSTRAINT "_UserHiddenDisciplines_A_fkey" FOREIGN KEY ("A") REFERENCES "Discipline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserHiddenDisciplines" ADD CONSTRAINT "_UserHiddenDisciplines_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
