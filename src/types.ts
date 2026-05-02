export interface TimingItem {
  timeStart: string;
  timeEnd: string;
  activity: string;
  speaker?: string;
}

export interface SpeakerData {
  name: string;
  jobTitle: string;
  reportTitle: string;
  reportDescription: string;
  photoFile?: File;
}

export interface EventData {
  date: string;
  partners: string;
  eventName: string;
  locationAddress: string;
  timing: TimingItem[];
  speakers: SpeakerData[];
}
