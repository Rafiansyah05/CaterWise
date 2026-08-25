Created At: 2026-08-24T16:29:11+08:00
Completed At: 2026-08-24T16:29:11+08:00
File Path: `file:///d:/PROJECT/CaterWise/apps/web/src/app/dashboard/page.tsx`
Total Lines: 244
Total Bytes: 11739
Showing lines 100 to 244
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
100:         headers: { 'Content-Type': 'application/json' },
101:         body: JSON.stringify({
102:           restaurant_id: restaurantId,
103:           target_date: dateStr
104:         })
105:       });
106:       
107:       if (!res.ok) throw new Error('Gagal menghubungi AI Backend (Pastikan server Python berjalan)');
108:       
109:       const data = await res.json();
110:       setForecasts(data.forecasts);
111:       setAiInsight(data.ai_insight);
112:     } catch (err: any) {
113:       setForecastError(err.message || 'Terjadi kesalahan saat membuat prediksi');
114:     } finally {
115:       setIsForecastLoading(false);
116:     }
117:   };
118: 
119:   if (loading) {
120:     return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
121:   }
122: 
123:   return (
124:     <div className="max-w-6xl mx-auto space-y-8">
125:       {/* Header */}
126:       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
127:         <div>
128:           <h1 className="text-2xl font-bold text-gray-900">Selamat datang, {userName} 👋</h1>
129:           <p className="text-gray-500 mt-1">Pantau kinerja dan prediksi produksi rumah makan Anda.</p>
130:         </div>
131:         <button 
132:           onClick={generateForecast}
133:           disabled={isForecastLoading}
134:           className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
135:         >
136:           {isForecastLoading ? (
137:             <>
138:               <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
139:               Menganalisa Data...
140:             </>
141:           ) : (
142:             <>
143:               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
144:               Buat Prediksi Besok
145:             </>
146:           )}
147:         </button>
148:       </div>
149: 
150:       {/* Stats Grid */}
151:       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
152:         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
153:           <p className="text-sm font-medium text-gray-500 mb-1">Total Menu Aktif</p>
154:           <p className="text-3xl font-bold text-gray-900">{totalMenus}</p>
155:         </div>
156:         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
157:           <p className="text-sm font-medium text-gray-500 mb-1">Total Penjualan Historis</p>
158:           <p className="text-3xl font-bold text-gray-900">{totalSales.toLocaleString('id-ID')}</p>
159:         </div>
160:         {/* We can add more stats like Average Surplus later */}
161:       </div>
162: 
163:       {/* Error State */}
164:       {forecastError && (
165:         <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
166:           <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
167:           <p className="text-sm font-medium">{forecastError}</p>
168:         </div>
169:       )}
170: 
171:       {/* Forecast Results */}
172:       {forecasts.length > 0 && (
173:         <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
174:           
175:           {/* AI Insight */}
176:           {aiInsight && (
177:             <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-6 rounded-2xl relative overflow-hidden">
178:               <div className="absolute top-0 right-0 p-4 opacity-10">
179:                 <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9 9H2L7 14L5 21L12 17L19 21L17 14L22 9H15L12 2Z"/></svg>
180:               </div>
181:               <h3 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
182:                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
183:                 AI Insights & Rekomendasi
184:               </h3>
185:               <div className="text-sm text-indigo-900/80 leading-relaxed space-y-3 whitespace-pre-wrap relative z-10">
186:                 {aiInsight}
187:               </div>
188:             </div>
189:           )}
190: 
191:           {/* Tables */}
192:           <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
193:             <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
194:               <h3 className="font-bold text-gray-900">Rekomendasi Produksi Besok</h3>
195:             </div>
196:             <div className="overflow-x-auto">
197:               <table className="w-full text-left text-sm text-gray-600">
198:                 <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500">
199:                   <tr>
200:                     <th className="px-6 py-4">Menu</th>
201:                     <th className="px-6 py-4 text-right">Rekomendasi (Prediksi)</th>
202:                     <th className="px-6 py-4">Model Dipilih</th>
203:                     <th className="px-6 py-4">Akurasi Model</th>
204:                   </tr>
205:                 </thead>
206:                 <tbody className="divide-y divide-gray-100">
207:                   {forecasts.map((f) => (
208:                     <tr key={f.menu_id} className="hover:bg-gray-50 transition-colors">
209:                       <td className="px-6 py-4 font-medium text-gray-900">{f.menu_name}</td>
210:                       <td className="px-6 py-4 text-right">
211:                         <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-lg text-base">
212:                           {f.predicted_quantity}
213:                         </span>
214:                       </td>
215:                       <td className="px-6 py-4">
216:                         <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
217:                           f.model_used === 'XGBoost' ? 'bg-green-100 text-green-700' : 
218:                           f.model_used === 'WMA' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
219:                         }`}>
220:                           {f.model_used}
221:                         </span>
222:                       </td>
223:                       <td className="px-6 py-4 text-xs text-gray-500">
224:                         {f.mae !== null ? (
225:                           <div>
226:                             <div>MAE: <span className="font-medium text-gray-700">{f.mae}</span></div>
227:                             <div>MAPE: <span className="font-medium text-gray-700">{f.mape}%</span></div>
228:                           </div>
229:                         ) : (
230:                           <span className="italic">Data belum cukup (butuh &ge;14 hari)</span>
231:                         )}
232:                       </td>
233:                     </tr>
234:                   ))}
235:                 </tbody>
236:               </table>
237:             </div>
238:           </div>
239:         </div>
240:       )}
241:     </div>
242:   );
243: }
244: 
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
