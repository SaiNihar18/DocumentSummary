import { parseSummaryBlocks } from "@/lib/markdown";

interface SummaryContentProps {
  text: string;
}

const PARAGRAPH_CLASS =
  "whitespace-pre-line text-sm font-medium leading-relaxed text-slate-800 transition-colors duration-300 dark:text-slate-100 sm:text-base sm:leading-relaxed print:text-sm print:font-medium print:leading-relaxed print:!text-slate-900";

export default function SummaryContent({ text }: SummaryContentProps) {
  const blocks = parseSummaryBlocks(text);

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => {
        if (block.type === "paragraph") {
          return (
            <p key={i} className={PARAGRAPH_CLASS}>
              {block.text}
            </p>
          );
        }

        return (
          <div key={i} className="overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse text-sm sm:text-base print:text-sm">
              <thead>
                <tr>
                  {block.headers.map((header, hi) => (
                    <th
                      key={hi}
                      className="border border-slate-200 bg-slate-50 px-3 py-1.5 text-left font-semibold text-slate-700 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 print:!border-slate-300 print:!bg-slate-100 print:!text-slate-900"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={ri} className="print:break-inside-avoid">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="border border-slate-200 px-3 py-1.5 text-slate-700 transition-colors duration-300 dark:border-slate-700 dark:text-slate-200 print:!border-slate-300 print:!text-slate-900"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
