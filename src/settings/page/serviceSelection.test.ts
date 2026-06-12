import { selectServiceOption } from './serviceSelection';

describe('selectServiceOption', () => {
  it('updates the selected provider/model and closes the dropdown', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();

    selectServiceOption('current', 'anthropic::claude-haiku-4.5', 'image_alt_text_prompt_service', onChange, onClose);

    expect(onChange).toHaveBeenCalledWith('image_alt_text_prompt_service', 'anthropic::claude-haiku-4.5');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clears the selection and closes the dropdown when the same option is clicked', () => {
    const onChange = jest.fn();
    const onClose = jest.fn();

    selectServiceOption(
      'anthropic::claude-haiku-4.5',
      'anthropic::claude-haiku-4.5',
      'image_alt_text_prompt_service',
      onChange,
      onClose
    );

    expect(onChange).toHaveBeenCalledWith('image_alt_text_prompt_service', '');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
