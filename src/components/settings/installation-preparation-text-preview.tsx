import { InstallationPreparationText, InstallationTextType } from '@/lib/types';

interface InstallationPreparationTextPreviewProps {
  texts: InstallationPreparationText[];
}

/**
 * Aperçu du texte de préparation d'installation tel qu'il apparaîtra dans le
 * bon de commande. Porté depuis `InstallationPreparationTextPreview.tsx`.
 */
export default function InstallationPreparationTextPreview({
  texts,
}: InstallationPreparationTextPreviewProps) {
  if (!texts || texts.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Aucune instruction de préparation n&apos;a été définie.
      </p>
    );
  }

  const renderText = (text: InstallationPreparationText) => {
    switch (text.type) {
      case InstallationTextType.TITLE:
        return (
          <h1 className="mt-6 text-3xl font-bold first:mt-0">{text.content}</h1>
        );
      case InstallationTextType.SUBTITLE:
        return (
          <h2 className="mt-4 text-2xl font-bold">{text.content}</h2>
        );
      case InstallationTextType.SUBTITLE2:
        return (
          <h3 className="mt-3 text-xl font-bold">{text.content}</h3>
        );
      case InstallationTextType.PARAGRAPH:
      default:
        return (
          <p className="mt-2 whitespace-pre-wrap text-base">{text.content}</p>
        );
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-1">
      {texts.map((text) => (
        <div key={text.id}>{renderText(text)}</div>
      ))}
    </div>
  );
}
