import '@mantine/code-highlight/styles.css';
import { useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  IconMoonFilled,
  IconDeviceFloppy,
  IconExternalLink,
  IconFileTypeCss,
  IconFileTypeHtml,
  IconFileTypeJs,
  IconSend,
  IconSunHighFilled,
  IconLoader,
  IconSunMoon,
  // NEW
  IconTrash,
} from '@tabler/icons-react';
import { CodeHighlight } from '@mantine/code-highlight';
import {
  ActionIcon,
  AppShell,
  Burger,
  Button,
  Group,
  Notification,
  Paper,
  ScrollArea,
  Text,
  useMantineColorScheme,
  Textarea,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { ApiKeyContext } from '@/components/ApiKeyContextProvider';

enum FileType {
  HTML = 0,
  CSS = 1,
  JS = 2,
}

const combineCode = (html: string, css: string, js: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${css}</style>
    </head>
    <body>
      ${html}
      <script>${js}</script>
    </body>
    </html>
  `;
};

function FullLayout() {
  const [opacity, setOpacity] = useState<number>(0);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  // ------------------------------------------------
  // Default file content (for resets)
  // ------------------------------------------------
  const defaultHtml = `
<p>This is rendered using dangerouslySetInnerHTML</p>
<h1>Hello world</h1>
<button onclick="h()">click me</button>
  `;
  const defaultCss = `
p {
  color: green;
}
h1 {
  font-size: 3rem;
  font-weight: 900; 
}
  `;
  const defaultJs = `
function h() {
  alert("workin");
}
  `;

  // ------------------------------------------------
  // Initial state for each file
  // ------------------------------------------------
  const [html, setHtml] = useState<string>(defaultHtml);
  const [css, setCss] = useState<string>(defaultCss);
  const [js, setJs] = useState<string>(defaultJs);

  // ------------------------------------------------
  // Restore from localStorage on mount
  // ------------------------------------------------
  useEffect(() => {
    const savedHtml = localStorage.getItem('savedHtml');
    const savedCss = localStorage.getItem('savedCss');
    const savedJs = localStorage.getItem('savedJs');

    if (savedHtml !== null) setHtml(savedHtml);
    if (savedCss !== null) setCss(savedCss);
    if (savedJs !== null) setJs(savedJs);
  }, []);

  // ------------------------------------------------
  // Chat state
  // ------------------------------------------------
  const [chatHistory, setChatHistory] = useState<
    { role: 'user' | 'bot'; message: string }[]
  >([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // ------------------------------------------------
  // We need the API key and model
  // ------------------------------------------------
  const { apiKey } = useContext(ApiKeyContext);
  const [model, setModel] = useState<any>(null);

  // Keep track of which file is currently active
  const [file, setFile] = useState<FileType>(FileType.HTML);

  // ------------------------------------------------
  // Initialize Google Generative AI
  // ------------------------------------------------
  useEffect(() => {
    if (!apiKey) return;
    const genAI = new GoogleGenerativeAI(apiKey);

    const schema = {
      description: 'Code update response',
      type: SchemaType.OBJECT,
      properties: {
        code: {
          type: SchemaType.STRING,
          description: 'Entire updated code for this file or null if no changes',
          nullable: true,
        },
      },
      required: ['code'],
    };

    const genAiModel = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });
    console.log('Initialized gemini model with JSON response configuration');
    setModel(genAiModel);
  }, [apiKey]);

  // ------------------------------------------------
  // Keyboard shortcut for saving code (CTRL+S or CMD+S)
  // ------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // ------------------------------------------------
  // Save local copies
  // ------------------------------------------------
  const handleSave = () => {
    const combinedCodeStr = combineCode(html, css, js);
    localStorage.setItem('previewCode', combinedCodeStr);

    localStorage.setItem('savedHtml', html);
    localStorage.setItem('savedCss', css);
    localStorage.setItem('savedJs', js);

    // Visual feedback
    setOpacity(1);
    setTimeout(() => {
      setOpacity(0);
    }, 1500);
  };

  // ------------------------------------------------
  // Open new tab with the combined code
  // ------------------------------------------------
  const handlePreview = () => {
    const combinedCodeStr = combineCode(html, css, js);
    localStorage.setItem('previewCode', combinedCodeStr);
    window.open('/preview', '_blank');
  };

  // ------------------------------------------------
  // NEW: Clear local storage and reset all file content
  // ------------------------------------------------
  const [clearAlert, setClearAlert] = useState<boolean>(false);

  const handleClearLocalStorage = () => {
    localStorage.removeItem('savedHtml');
    localStorage.removeItem('savedCss');
    localStorage.removeItem('savedJs');
    localStorage.removeItem('previewCode');

    setHtml(defaultHtml);
    setCss(defaultCss);
    setJs(defaultJs);

    // Optional: show a small notification
    setClearAlert(true);
    setTimeout(() => setClearAlert(false), 1500);
  };

  // ------------------------------------------------
  // Generate AI prompt
  // ------------------------------------------------
  const handleGenAIPrompt = useCallback(async () => {
    const userPrompt = prompt.trim();
    if (!model || !userPrompt) return;

    // 1) Add user message
    setChatHistory((prev) => [...prev, { role: 'user', message: userPrompt }]);
    setPrompt('');

    // 2) Add a temporary loading message
    setChatHistory((prev) => [
      ...prev,
      { role: 'bot', message: 'Generating response...' },
    ]);

    // 3) Decide which file's content to include
    let currentFileContent: string;
    let fileLabel: string;
    switch (file) {
      case FileType.HTML:
        currentFileContent = html;
        fileLabel = 'HTML';
        break;
      case FileType.CSS:
        currentFileContent = css;
        fileLabel = 'CSS';
        break;
      case FileType.JS:
        currentFileContent = js;
        fileLabel = 'JavaScript';
        break;
      default:
        currentFileContent = '';
        fileLabel = 'Unknown';
    }

    // 4) Construct the prompt
    const modelPrompt = `
Current file type: ${fileLabel}
Current file contents:
${currentFileContent}

Instructions:
- Only update the code for this single file (the rest of the project is off-limits).
- The user prompt is: "${userPrompt}".
- Return your response as valid JSON with the structure: {"code": "<ENTIRE UPDATED CODE for this file or null if no changes>"}.
- Do not include any explanation or extra text.
    `;

    try {
      setAiLoading(true);
      const result = await model.generateContent(modelPrompt);
      setAiLoading(false);

      if (!result || !result.response) {
        throw new Error('No valid response from the AI model.');
      }

      const responseText = await result.response.text();
      console.log('Raw AI response:', responseText);

      let parsed: { code: string | null } = { code: null };
      try {
        parsed = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        throw new Error('Invalid JSON received from AI response.');
      }

      if (!('code' in parsed)) {
        throw new Error("AI response JSON doesn't contain the 'code' property.");
      }

      const { code } = parsed;

      // 5) If code is not null, update the currently selected file
      if (code !== null && typeof code === 'string') {
        switch (file) {
          case FileType.HTML:
            setHtml(code);
            break;
          case FileType.CSS:
            setCss(code);
            break;
          case FileType.JS:
            setJs(code);
            break;
        }

        // Replace "Generating response..." with success
        setChatHistory((prev) => {
          const updated = [...prev];
          updated.pop(); // remove "Generating response..."
          return [
            ...updated,
            { role: 'bot', message: 'Code updated successfully.' },
          ];
        });
      } else {
        // code is null → no changes
        setChatHistory((prev) => {
          const updated = [...prev];
          updated.pop();
          return [
            ...updated,
            { role: 'bot', message: 'No changes were made to the code.' },
          ];
        });
      }
    } catch (error) {
      setAiLoading(false);
      console.error('Error generating content:', error);

      // Replace loading message with error message
      setChatHistory((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.message === 'Generating response...') {
          updated.pop();
        }
        return [
          ...updated,
          {
            role: 'bot',
            message:
              'Error: The AI returned an invalid response or could not process the request.',
          },
        ];
      });
    }
  }, [prompt, model, file, html, css, js]);

  // ------------------------------------------------
  // Always scroll chat to the bottom
  // ------------------------------------------------
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Mantine burger for nav
  const [opened, { toggle }] = useDisclosure();

  // Render the file content in the main area
  const renderFile = (f: FileType) => {
    if (f === FileType.HTML) {
      return <CodeHighlight code={html} language="html" />;
    }
    if (f === FileType.CSS) {
      return <CodeHighlight code={css} language="css" />;
    }
    if (f === FileType.JS) {
      return <CodeHighlight code={js} language="js" />;
    }
    return null;
  };

  // Handler to send prompt on Enter key (without Shift)
  const handlePromptKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleGenAIPrompt();
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      footer={{ height: 0 }}
      navbar={{ width: 200, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      aside={{ width: 600, breakpoint: 'md', collapsed: { desktop: false, mobile: true } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />

          <h1>Welcome</h1>

          <div className="flex flex-row justify-center items-center">
            <ActionIcon
              variant="transparent"
              aria-label="Theme"
              className="mr-4"
              onClick={() => {
                if (colorScheme === 'light' || colorScheme === 'auto') {
                  setColorScheme('dark');
                } else {
                  setColorScheme('light');
                }
              }}
            >
              {colorScheme === 'light' ? (
                <IconMoonFilled style={{ width: '70%', height: '70%' }} stroke={1.5} />
              ) : colorScheme === 'dark' ? (
                <IconSunHighFilled style={{ width: '70%', height: '70%' }} stroke={1.5} />
              ) : (
                <IconSunMoon style={{ width: '70%', height: '70%' }} stroke={1.5} />
              )}
            </ActionIcon>

            <Button
              onClick={handleSave}
              variant="outline"
              className="mr-4"
              rightSection={<IconDeviceFloppy size={18} />}
            >
              Save
            </Button>

            <Button
              onClick={handlePreview}
              variant="outline"
              className="mr-4"
              rightSection={<IconExternalLink size={18} />}
            >
              Preview
            </Button>

            {/* NEW: Clear Local Storage button */}
            <Button
              onClick={handleClearLocalStorage}
              variant="outline"
              color="red"
              rightSection={<IconTrash size={18} />}
            >
              Clear
            </Button>
          </div>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Button
          variant="subtle"
          color="gray"
          radius="md"
          fullWidth
          justify="start"
          leftSection={<IconFileTypeHtml size={16} />}
          onClick={() => setFile(FileType.HTML)}
        >
          <p className="font-normal">index.html</p>
        </Button>
        <Button
          variant="subtle"
          color="gray"
          radius="md"
          fullWidth
          justify="start"
          leftSection={<IconFileTypeCss size={16} />}
          onClick={() => setFile(FileType.CSS)}
        >
          <p className="font-normal">style.css</p>
        </Button>
        <Button
          variant="subtle"
          color="gray"
          radius="md"
          fullWidth
          justify="start"
          leftSection={<IconFileTypeJs size={16} />}
          onClick={() => setFile(FileType.JS)}
        >
          <p className="font-normal">main.js</p>
        </Button>
      </AppShell.Navbar>

      <AppShell.Main>{renderFile(file)}</AppShell.Main>

      <AppShell.Aside p="md">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <ScrollArea style={{ flex: 1, marginBottom: '1rem' }} viewportRef={chatContainerRef}>
            {chatHistory.map((chat, idx) => (
              <Paper
                key={idx}
                p="sm"
                mb="sm"
                shadow="xs"
                style={{
                  backgroundColor: chat.role === 'user' ? '#e0f7fa' : '#f1f8e9',
                }}
              >
                <Text size="sm" fw={500}>
                  {chat.role === 'user' ? 'You' : 'AI'}
                </Text>
                <Text size="sm">{chat.message}</Text>
              </Paper>
            ))}
          </ScrollArea>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Textarea
              placeholder="Enter your prompt (Shift+Enter for a new line)"
              value={prompt}
              onChange={(event) => setPrompt(event.currentTarget.value)}
              onKeyDown={handlePromptKeyDown}
              minRows={3}
              autosize
            />
            <Button onClick={handleGenAIPrompt}>
              {aiLoading ? <IconLoader className="animate-spin" /> : <IconSend size={16} />}
            </Button>
          </div>
        </div>

        {/* Saved file notification */}
        {opacity > 0 && (
          <Notification
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              zIndex: 1000,
            }}
            withCloseButton={false}
            title="File Saved 📁"
          >
            Please check preview window (or reopen if needed).
          </Notification>
        )}

        {/* NEW: Clear local storage notification */}
        {clearAlert && (
          <Notification
            style={{
              position: 'fixed',
              bottom: '70px',
              right: '20px',
              zIndex: 1000,
            }}
            withCloseButton={false}
            title="Storage Cleared"
            color="red"
          >
            Local code files have been reset.
          </Notification>
        )}
      </AppShell.Aside>
    </AppShell>
  );
}

export default FullLayout;
