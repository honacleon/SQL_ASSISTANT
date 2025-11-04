import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Detecta se tem tabela markdown
  const hasTable = content.includes('|') && content.includes('---');
  
  if (!hasTable) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }
  
  // Separa texto de tabela
  const parts = content.split(/(\|[^\n]+\|\n\|[-\s|]+\|\n(?:\|[^\n]+\|\n?)+)/g);
  
  return (
    <div>
      {parts.map((part, index) => {
        if (part.includes('|') && part.includes('---')) {
          // É uma tabela - renderiza com scroll
          return (
            <div key={index} className="my-4 overflow-x-auto border rounded-lg shadow-sm">
              <div className="inline-block min-w-full">
                <table className="min-w-full divide-y divide-gray-200">
                  {renderTable(part)}
                </table>
              </div>
              <div className="text-xs text-gray-500 text-center py-2 bg-gray-50 border-t">
                ← Arraste para ver mais colunas →
              </div>
            </div>
          );
        }
        return <p key={index} className="whitespace-pre-wrap">{part}</p>;
      })}
    </div>
  );
};

function renderTable(markdown: string) {
  const lines = markdown.trim().split('\n');
  const headers = lines[0].split('|').filter(h => h.trim());
  const rows = lines.slice(2).map(line => 
    line.split('|').filter(cell => cell.trim())
  );
  
  return (
    <>
      <thead className="bg-gray-50">
        <tr>
          {headers.map((header, i) => (
            <th 
              key={i} 
              className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap border-b-2 border-gray-200"
            >
              {header.trim()}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {rows.map((row, i) => (
          <tr key={i} className="hover:bg-gray-50 transition-colors">
            {row.map((cell, j) => (
              <td 
                key={j} 
                className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
              >
                {cell.trim()}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </>
  );
}
