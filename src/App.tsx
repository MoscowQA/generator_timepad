import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { EventData, SpeakerData } from './types';
import { ImageCropper } from './components/ImageCropper';

// Extend SpeakerData for frontend state
interface FormSpeakerData extends SpeakerData {
  photoFileUrl?: string; // Preview URL for cropped image
  photoFileBlob?: Blob; // Actual cropped image Blob
  isDraft?: boolean;
}

interface FormEventData extends Omit<EventData, 'speakers'> {
  speakers: FormSpeakerData[];
}

const cyrillicToLatinMap: Record<string, string> = {
  "а": 'a',
  "б": 'b',
  "в": 'v',
  "г": 'g',
  "д": 'd',
  "е": 'e',
  "ё": 'e',
  "ж": 'zh',
  "з": 'z',
  "и": 'i',
  "й": 'y',
  "к": 'k',
  "л": 'l',
  "м": 'm',
  "н": 'n',
  "о": 'o',
  "п": 'p',
  "р": 'r',
  "с": 's',
  "т": 't',
  "у": 'u',
  "ф": 'f',
  "х": 'h',
  "ц": 'ts',
  "ч": 'ch',
  "ш": 'sh',
  "щ": 'shch',
  "ъ": '',
  "ы": 'y',
  "ь": '',
  "э": 'e',
  "ю": 'yu',
  "я": 'ya'
};

function transliterate(text: string): string {
  let t = text.toLowerCase();
  t = t.replace(/кс/g, 'x'); // Для преобразования "Алексей" в "Alexey"
  return t
    .split('')
    .map(char => cyrillicToLatinMap[char] || char)
    .join('');
}

function toCamelCaseFilename(name: string): string {
  if (!name) return `speaker_${Date.now()}`;
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return `speaker_${Date.now()}`;

  const transliteratedWords = words.map(w => transliterate(w).replace(/[^a-z0-9]/gi, ''));

  if (transliteratedWords.length === 1) return transliteratedWords[0];

  const firstWord = transliteratedWords[0];
  const restWords = transliteratedWords.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1));

  return firstWord + restWords.join('');
}

const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const generateHTML = (data: FormEventData, speakersWithFilenames: any[]): string => {
  let html = `<p>${data.date} <strong><em>вместе с компаниями</em> <em>${data.partners}</em> пройдет митап ${data.eventName}.</strong></p>\n\n`;
  html += `<h3 class="tsubheader"><strong>Тайминг:</strong></h3>\n<p>\n`;

  data.timing.forEach(t => {
    html += `  ${t.timeStart} &mdash; ${t.timeEnd} &mdash; ${t.activity}${t.speaker ? `, ${t.speaker}` : ''}<br />\n`;
  });
  html += `</p>\n\n`;

  const validSpeakers = speakersWithFilenames.filter(
    s => s.name.trim() !== '' || s.reportTitle.trim() !== '' || s.filename
  );

  if (validSpeakers.length > 0) {
    html += `<h3 class="tsubheader"><strong>Доклады:</strong></h3>\n`;
    validSpeakers.forEach(s => {
      const photoSrc = s.filename ? s.filename : '';
      html += `<p><img alt="${s.name}" src="${photoSrc}" style="width:180px;height:180px;margin:10px 30px;float:left;border-radius:50%;" /><strong>${s.reportTitle}</strong></p>\n`;
      html += `<p>${s.reportDescription}</p>\n`;
      html += `<p>&nbsp;</p>\n`;
      html += `<p><em>${s.name}, ${s.jobTitle}</em></p>\n`;
      html += `<p>&nbsp;</p>\n`;
    });
  }

  html += `<p><em>Следите за нашими анонсами в информационных каналах: <span class="c15 c17"><a class="c18" href="https://t.me/moscowqa">telegram</a></span><span class="c0 c15"> и </span><span class="c15 c17"><a class="c18" href="https://t.me/moscowqa_chat">telegram chat</a> , а так же <a href="https://vk.com/moscow_qa">vk</a></span></em></p>\n\n`;
  html += `<h3>Площадка:</h3>\n`;
  html += `<p>Встреча пройдет по адресу:</p>\n`;
  html += `<p>${data.locationAddress}</p>\n\n`;

  html += `<h3><strong>Категории билетов</strong></h3>\n`;
  html += `<p><strong>Онлайн-формат </strong></p>\n`;
  html += `<p><strong>РЕГИСТРИРОВАТЬСЯ НЕ НАДО, следите за нашим каналом <a href="https://t.me/moscowqa">moscowqa</a></strong></p>\n`;
  html += `<p><strong>Офлайн-формат </strong></p>\n`;
  html += `<p>Так как количество мест ограничено, в офлайн смогут попасть не все.  Не расстраивайтесь, если вы не попадете лично. В онлайн-трансляции к просмотру и вашему участию будут доступны все наши доклады.  </p>\n`;
  html += `<p><br />С собой надо иметь паспорт или ВУ</p>\n`;

  return html;
};

function App() {
  const { register, control, handleSubmit, setValue, watch } = useForm<FormEventData>({
    defaultValues: {
      timing: [{ timeStart: '', timeEnd: '', activity: '', speaker: '' }],
      speakers: [] // Start with an empty list of speakers
    }
  });

  const {
    fields: timingFields,
    append: appendTiming,
    remove: removeTiming
  } = useFieldArray({
    control,
    name: 'timing'
  });

  const {
    fields: speakerFields,
    append: appendSpeaker,
    remove: removeSpeaker
  } = useFieldArray({
    control,
    name: 'speakers'
  });

  const [htmlResult, setHtmlResult] = useState<string>('');

  // State for crop modal
  const [croppingSpeakerIndex, setCroppingSpeakerIndex] = useState<number | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  // State for temporary "draft" speaker form
  const [draftSpeaker, setDraftSpeaker] = useState<FormSpeakerData>({
    name: '',
    jobTitle: '',
    reportTitle: '',
    reportDescription: '',
    photoFileUrl: '',
    photoFileBlob: undefined
  });
  const [isAddingSpeaker, setIsAddingSpeaker] = useState(false);

  const onDraftFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setImageToCrop(imageUrl);
      setCroppingSpeakerIndex(-1); // -1 signifies the draft speaker
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedImageBlob: Blob) => {
    const previewUrl = URL.createObjectURL(croppedImageBlob);
    if (croppingSpeakerIndex === -1) {
      // Update draft speaker
      setDraftSpeaker(prev => ({
        ...prev,
        photoFileBlob: croppedImageBlob,
        photoFileUrl: previewUrl
      }));
    } else if (croppingSpeakerIndex !== null) {
      // Update existing speaker
      setValue(`speakers.${croppingSpeakerIndex}.photoFileBlob`, croppedImageBlob);
      setValue(`speakers.${croppingSpeakerIndex}.photoFileUrl`, previewUrl);
    }
    setCroppingSpeakerIndex(null);
    setImageToCrop(null);
  };

  const handleCropCancel = () => {
    setCroppingSpeakerIndex(null);
    setImageToCrop(null);
  };

  const handleSaveDraftSpeaker = () => {
    // Validation check for draft speaker
    if (!draftSpeaker.name || !draftSpeaker.reportTitle) {
      alert('Пожалуйста, заполните хотя бы имя и тему доклада');
      return;
    }
    appendSpeaker({ ...draftSpeaker });

    // Reset draft and hide form
    setDraftSpeaker({
      name: '',
      jobTitle: '',
      reportTitle: '',
      reportDescription: '',
      photoFileUrl: '',
      photoFileBlob: undefined
    });
    setIsAddingSpeaker(false);
  };

  const onSubmit = async (data: FormEventData) => {
    try {
      const speakersWithFilenames = data.speakers.map(speaker => {
        const filename = speaker.photoFileBlob ? `${toCamelCaseFilename(speaker.name)}.png` : null;
        return {
          ...speaker,
          filename
        };
      });

      // Trigger downloads for each speaker's photo
      speakersWithFilenames.forEach(speaker => {
        if (speaker.photoFileBlob && speaker.filename) {
          downloadFile(speaker.photoFileBlob, speaker.filename);
        }
      });

      // Generate HTML locally without backend
      const generatedHTML = generateHTML(data, speakersWithFilenames);
      setHtmlResult(generatedHTML);

      // Optional: Also download the HTML file automatically
      // const htmlBlob = new Blob([generatedHTML], { type: 'text/html' });
      // downloadFile(htmlBlob, 'announcement.html');
    } catch (error) {
      console.error('Error generating event:', error);
      alert('Ошибка при генерации события');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(htmlResult).then(() => {
      alert('Скопировано в буфер обмена!');
    });
  };

  const speakersWatch = watch('speakers');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Генератор Анонсов Митапов</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Дата</label>
              <input
                {...register('date', { required: true })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                placeholder="Например: 15 сентября"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Партнеры</label>
              <input
                {...register('partners', { required: true })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                placeholder="VK, Яндекс"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Название митапа</label>
              <input
                {...register('eventName', { required: true })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                placeholder="Moscow QA Meetup"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Адрес площадки</label>
              <input
                {...register('locationAddress', { required: true })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                placeholder="Москва, ул. Льва Толстого, 16"
              />
            </div>
          </div>

          {/* Timing */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Тайминг</h2>
              <button
                type="button"
                onClick={() =>
                  appendTiming({ timeStart: '', timeEnd: '', activity: '', speaker: '' })
                }
                className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-md hover:bg-blue-100"
              >
                Добавить пункт
              </button>
            </div>
            <div className="space-y-3">
              {timingFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <input
                    {...register(`timing.${index}.timeStart` as const, { required: true })}
                    className="w-24 border rounded p-2"
                    placeholder="19:00"
                  />
                  <span className="mt-2">-</span>
                  <input
                    {...register(`timing.${index}.timeEnd` as const, { required: true })}
                    className="w-24 border rounded p-2"
                    placeholder="19:30"
                  />
                  <input
                    {...register(`timing.${index}.activity` as const, { required: true })}
                    className="flex-1 border rounded p-2"
                    placeholder="Сбор гостей"
                  />

                  {/* Select speaker from the added speakers list */}
                  <select
                    {...register(`timing.${index}.speaker` as const)}
                    className="flex-1 border rounded p-2 bg-white text-gray-700"
                  >
                    <option value="">Без спикера</option>
                    {speakersWatch.map(
                      (speaker, sIndex) =>
                        speaker.name && (
                          <option key={sIndex} value={speaker.name}>
                            {speaker.name}
                          </option>
                        )
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => removeTiming(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Speakers */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Доклады / Спикеры</h2>
              {!isAddingSpeaker && (
                <button
                  type="button"
                  onClick={() => setIsAddingSpeaker(true)}
                  className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-md hover:bg-blue-100"
                >
                  Добавить спикера
                </button>
              )}
            </div>

            {/* List of added speakers (collapsed view) */}
            <div className="space-y-4 mb-6">
              {speakerFields.map((field, index) => {
                const speaker = speakersWatch[index];
                return (
                  <div
                    key={field.id}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border flex items-center justify-center">
                        {speaker?.photoFileUrl ? (
                          <img
                            src={speaker.photoFileUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-gray-500 text-center">Нет</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{speaker.name || 'Без имени'}</p>
                        <p className="text-sm text-gray-600">{speaker.reportTitle || 'Без темы'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSpeaker(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Удалить
                    </button>

                    {/* Hidden inputs to keep react-hook-form happy since we don't display the full form here */}
                    <input type="hidden" {...register(`speakers.${index}.name` as const)} />
                    <input type="hidden" {...register(`speakers.${index}.jobTitle` as const)} />
                    <input type="hidden" {...register(`speakers.${index}.reportTitle` as const)} />
                    <input
                      type="hidden"
                      {...register(`speakers.${index}.reportDescription` as const)}
                    />
                  </div>
                );
              })}
            </div>

            {/* Draft Speaker Form */}
            {isAddingSpeaker && (
              <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50 relative mb-6">
                <button
                  type="button"
                  onClick={() => setIsAddingSpeaker(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-sm"
                >
                  ✕ Отмена
                </button>
                <h3 className="font-semibold mb-4 text-blue-800">Новый спикер</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 flex items-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border flex items-center justify-center">
                      {draftSpeaker.photoFileUrl ? (
                        <img
                          src={draftSpeaker.photoFileUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-gray-500 text-center">Нет фото</span>
                      )}
                    </div>
                    <div>
                      <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Загрузить фото
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={onDraftFileChange}
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        Идеально 1:1, будет обрезано в круг
                      </p>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="speaker-name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Имя спикера
                    </label>
                    <input
                      id="speaker-name"
                      value={draftSpeaker.name}
                      onChange={e => setDraftSpeaker({ ...draftSpeaker, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="speaker-jobTitle"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Должность и компания
                    </label>
                    <input
                      id="speaker-jobTitle"
                      value={draftSpeaker.jobTitle}
                      onChange={e => setDraftSpeaker({ ...draftSpeaker, jobTitle: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label
                      htmlFor="speaker-reportTitle"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Тема доклада
                    </label>
                    <input
                      id="speaker-reportTitle"
                      value={draftSpeaker.reportTitle}
                      onChange={e =>
                        setDraftSpeaker({ ...draftSpeaker, reportTitle: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label
                      htmlFor="speaker-reportDescription"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Описание доклада
                    </label>
                    <textarea
                      id="speaker-reportDescription"
                      value={draftSpeaker.reportDescription}
                      onChange={e =>
                        setDraftSpeaker({ ...draftSpeaker, reportDescription: e.target.value })
                      }
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    ></textarea>
                  </div>

                  <div className="md:col-span-2 flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleSaveDraftSpeaker}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
                    >
                      ✓ Сохранить спикера
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 text-lg shadow-sm"
            >
              Сгенерировать HTML и скачать фото
            </button>
          </div>
        </form>

        {/* Result Section */}
        {htmlResult && (
          <div className="mt-12 border-t pt-8">
            <h2 className="text-2xl font-bold mb-4">Результат</h2>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-gray-800">HTML Код</h3>
                <button
                  onClick={copyToClipboard}
                  className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200"
                >
                  Скопировать
                </button>
              </div>
              <textarea
                readOnly
                value={htmlResult}
                rows={10}
                className="w-full font-mono text-sm p-4 bg-gray-50 border rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Превью</h3>
              <div
                className="border rounded-lg p-6 bg-white prose max-w-none"
                dangerouslySetInnerHTML={{ __html: htmlResult }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Crop Modal */}
      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}

export default App;
