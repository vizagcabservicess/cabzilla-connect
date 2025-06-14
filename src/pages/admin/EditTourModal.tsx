import React, { useState } from 'react';

type ItineraryDay = { day: number, title: string, description: string, activities: string[] };

type EditTourModalProps = {
  initialTour?: {
    tourId: string;
    tourName: string;
    distance: number;
    days: number;
    imageUrl?: string;
    description?: string;
    gallery?: string[];
    inclusions?: string[];
    exclusions?: string[];
    itinerary?: ItineraryDay[];
    timeDuration?: string;
  };
  onSave: (tour: any) => void;
  onCancel: () => void;
};

const EditTourModal: React.FC<EditTourModalProps> = ({ initialTour, onSave, onCancel }) => {
  const [gallery, setGallery] = useState<string[]>(initialTour?.gallery || []);
  const [galleryInput, setGalleryInput] = useState('');
  const [inclusionsInput, setInclusionsInput] = useState((initialTour?.inclusions || []).join('\n'));
  const [exclusionsInput, setExclusionsInput] = useState((initialTour?.exclusions || []).join('\n'));
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(initialTour?.itinerary || []);
  const [timeDuration, setTimeDuration] = useState(initialTour?.timeDuration || '');

  const handleAddGallery = () => {
    if (galleryInput.trim()) {
      setGallery([...gallery, galleryInput.trim()]);
      setGalleryInput('');
    }
  };

  const handleRemoveGallery = (idx: number) => {
    setGallery(gallery.filter((_, i) => i !== idx));
  };

  const handleAddItineraryDay = () => {
    setItinerary([
      ...itinerary,
      { day: itinerary.length + 1, title: '', description: '', activities: [] },
    ]);
  };

  const handleRemoveItineraryDay = (idx: number) => {
    setItinerary(itinerary.filter((_, i) => i !== idx));
  };

  const handleItineraryChange = (
    idx: number,
    field: keyof ItineraryDay,
    value: string | string[]
  ) => {
    const newItinerary = [...itinerary];
    if (field === 'activities' && typeof value === 'string') {
      newItinerary[idx][field] = value.split('\n').filter(Boolean);
    } else {
      (newItinerary[idx][field] as any) = value;
    }
    setItinerary(newItinerary);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...initialTour,
      timeDuration,
      gallery,
      inclusions: inclusionsInput.split('\n').filter(Boolean),
      exclusions: exclusionsInput.split('\n').filter(Boolean),
      itinerary,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: '0 auto' }}>
      <h2>Edit Tour</h2>
      {/* Add Time Duration field after days */}
      <label>Time Duration</label>
      <input
        type="text"
        value={timeDuration}
        onChange={e => setTimeDuration(e.target.value)}
        placeholder="e.g. 6 hours, Full Day"
      />
      {/* Gallery */}
      <label>Gallery Image URLs</label>
      <div>
        <input
          type="text"
          value={galleryInput}
          onChange={e => setGalleryInput(e.target.value)}
          placeholder="Paste image URL and press Add"
        />
        <button type="button" onClick={handleAddGallery}>Add</button>
      </div>
      <ul>
        {gallery.map((url, idx) => (
          <li key={idx}>
            <img src={url} alt={`Gallery ${idx+1}`} style={{width: 60, height: 40, objectFit: 'cover'}} />
            <button type="button" onClick={() => handleRemoveGallery(idx)}>Remove</button>
          </li>
        ))}
      </ul>
      {/* Inclusions/Exclusions */}
      <label>Inclusions (one per line)</label>
      <textarea
        value={inclusionsInput}
        onChange={e => setInclusionsInput(e.target.value)}
        placeholder="e.g. AC, Bottle Water, Music System"
      />
      <label>Exclusions (one per line)</label>
      <textarea
        value={exclusionsInput}
        onChange={e => setExclusionsInput(e.target.value)}
        placeholder="e.g. Entry tickets, Lunch"
      />
      {/* Itinerary */}
      <label>Itinerary</label>
      {itinerary.map((day, idx) => (
        <div key={idx} style={{border: '1px solid #eee', marginBottom: 8, padding: 8}}>
          <input
            type="text"
            value={day.title}
            onChange={e => handleItineraryChange(idx, 'title', e.target.value)}
            placeholder="Day Title"
          />
          <textarea
            value={day.description}
            onChange={e => handleItineraryChange(idx, 'description', e.target.value)}
            placeholder="Description"
          />
          <textarea
            value={day.activities.join('\n')}
            onChange={e => handleItineraryChange(idx, 'activities', e.target.value)}
            placeholder="Activities (one per line)"
          />
          <button type="button" onClick={() => handleRemoveItineraryDay(idx)}>Remove Day</button>
        </div>
      ))}
      <button type="button" onClick={handleAddItineraryDay}>Add Day</button>
      <div style={{ marginTop: 16 }}>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" style={{ marginLeft: 8 }}>Save Tour</button>
      </div>
    </form>
  );
};

export default EditTourModal; 