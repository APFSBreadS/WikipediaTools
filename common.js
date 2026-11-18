(async function() {
    'use strict';

    if (typeof mw === 'undefined') return;

    window.WikiTools = window.WikiTools || {};

    const GITHUB_USER = 'APFSBreadS';
    const REPO_NAME = 'WikipediaTools';
    const BRANCH = 'main';

    const CONFIG_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${REPO_NAME}/${BRANCH}/config.json?v=` + Date.now();

    try {
        const response = await fetch(CONFIG_URL);
        if (!response.ok) throw new Error('Errore di rete durante il caricamento della configurazione.');
        WikiTools.Config = await response.json();
    } catch (err) {
        console.error('[WikiTools] Impossibile caricare il file di configurazione:', err);
        return;
    }

    WikiTools.UI = {
        initViewMode() {
            if (mw.config.get('wgAction') !== 'view') return;

            $(document).ready(() => {
                const $editTab = $('#ca-edit, #ca-ve-edit, .vector-tab-empty');
                if (!$editTab.length && !$('#ca-viewsource').length) return;

                const namespace = mw.config.get('wgNamespaceNumber');
                const pageName = mw.config.get('wgPageName');
                const isDiscussionPage = (namespace % 2 !== 0);

                let menuItemsHtml = '';
                WikiTools.Config.avvisiVoci.forEach((item, index) => {
                    menuItemsHtml += `<a href="#" class="speedy-item" data-index="${index}" style="display: block; padding: 6px 10px; color: #0645ad; text-decoration: none; border-bottom: 1px solid #eaecf0;">${item.name}</a>`;
                });

                const $menuContainer = $(
                    `<li id="ca-speedy-delete" class="mw-list-item" style="position: relative; display: inline-block; vertical-align: middle;">
                        <a href="#" id="speedy-toggle">
                            <span>Avvisi voci</span>
                        </a>
                        <div id="speedy-dropdown" style="display: none; position: absolute; top: 100%; left: 0; background: #fff; border: 1px solid #a7d7f9; box-shadow: 0 4px 10px rgba(0,0,0,0.15); z-index: 99999; padding: 5px; min-width: 180px; white-space: nowrap; border-radius: 4px;">
                            ${menuItemsHtml}
                        </div>
                    </li>`
                );

                if ($editTab.length) {
                    $editTab.first().after($menuContainer);
                } else {
                    $('#p-views ul').append($menuContainer);
                }

                let $lastInsertedElement = $menuContainer;

                if (isDiscussionPage) {
                    let discItemsHtml = '';
                    WikiTools.Config.avvisiDiscussione.forEach((macroItem, index) => {
                        discItemsHtml += `<a href="#" class="disc-macro-item" data-index="${index}" style="display: block; padding: 6px 10px; color: #0645ad; text-decoration: none; border-bottom: 1px solid #eaecf0;">${macroItem.name}</a>`;
                    });

                    const $discContainer = $(
                        `<li id="ca-disc-avvisi" class="mw-list-item" style="position: relative; display: inline-block; vertical-align: middle; margin-left: 4px;">
                            <a href="#" id="disc-toggle" style="background-color: #eef2f5; color: #333; font-weight: bold; border-radius: 3px; padding: 0.5em 1em;">
                                <span>Avvisi discussione</span>
                            </a>
                            <div id="disc-dropdown" style="display: none; position: absolute; top: 100%; left: 0; background: #fff; border: 1px solid #a7d7f9; box-shadow: 0 4px 10px rgba(0,0,0,0.15); z-index: 99999; padding: 5px; min-width: 180px; white-space: nowrap; border-radius: 4px;">
                                ${discItemsHtml}
                            </div>
                        </li>`
                    );
                    $menuContainer.after($discContainer);
                    $lastInsertedElement = $discContainer;

                    $('#disc-toggle').on('click', function(e) {
                        e.preventDefault();
                        $('#disc-dropdown').toggle();
                    });

                    $('.disc-macro-item').on('click', async function(e) {
                        e.preventDefault();
                        $('#disc-dropdown').hide();
                        const index = $(this).attr('data-index');
                        const macroObj = WikiTools.Config.avvisiDiscussione[index];

                        const selectedOption = await WikiTools.Templates.showMacroOptionsModal(macroObj);
                        if (selectedOption) {
                            WikiTools.Templates.process(selectedOption, true);
                        }
                    });
                }

                const isUserContext = (namespace === 2 || namespace === 3 || pageName.startsWith('Speciale:Contributi') || pageName.startsWith('Special:Contributions'));

                if (isUserContext) {
                    const $segnalaBtn = $(
                        `<li id="ca-segnala-utente" class="mw-list-item" style="position: relative; display: inline-block; vertical-align: middle; margin-left: 4px;">
                            <a href="#" id="segnala-toggle" style="background-color: #fee7e6; color: #d33; font-weight: bold; border-radius: 3px; padding: 0.5em 1em;">
                                <span>Segnala</span>
                            </a>
                        </li>`
                    );
                    $lastInsertedElement.after($segnalaBtn);

                    $('#segnala-toggle').on('click', function(e) {
                        e.preventDefault();
                        WikiTools.Report.init();
                    });
                }

                $('#speedy-toggle').on('click', function(e) {
                    e.preventDefault();
                    $('#speedy-dropdown').toggle();
                });

                $(document).on('click', function(e) {
                    if (!$(e.target).closest('#ca-speedy-delete, #ca-disc-avvisi').length) {
                        $('#speedy-dropdown').hide();
                        $('#disc-dropdown').hide();
                    }
                });

                $('.speedy-item').on('click', function(e) {
                    e.preventDefault();
                    $('#speedy-dropdown').hide();
                    const index = $(this).attr('data-index');
                    WikiTools.Templates.process(WikiTools.Config.avvisiVoci[index], false);
                });
            });
        },

        initDiffMode() {
            const isDiff = mw.config.get('wgDiffNewId') !== null || mw.util.getParamValue('diff') !== null;
            if (!isDiff) return;

            $(document).ready(() => {
                const $diffMeta = $('.mw-diff-ntitle, .diff-ntitle, .ve-ui-mwDiffPage-meta, .mw-diff-otitle');
                if (!$diffMeta.length) return;

                if ($('#custom-undo-btn').length) return;

                const $undoBtn = $(
                    `<span class="mw-usermessage-undo" style="margin-left: 10px; display: inline-block;">
                        <a href="#" id="custom-undo-btn" class="mw-ui-button mw-ui-quiet" style="font-weight: bold; color: #d33; padding: 4px 8px; border: 1px solid #d33; border-radius: 3px;">[undo]</a>
                     </span>`
                );

                $diffMeta.first().append($undoBtn);

                $('#custom-undo-btn').on('click', function(e) {
                    e.preventDefault();
                    WikiTools.Undo.showModal();
                });
            });
        }
    };

    WikiTools.Report = {
        async init() {
            let targetUser = this.extractUserFromUrl();
            if (!targetUser) {
                targetUser = prompt("Inserisci il nome utente da segnalare:");
                if (!targetUser || !targetUser.trim()) return;
                targetUser = targetUser.trim();
            }

            const segnalazioneScelta = await this.showReportModal(targetUser);
            if (!segnalazioneScelta) return;

            this.submitReport(targetUser, segnalazioneScelta);
        },

        extractUserFromUrl() {
            const pageName = mw.config.get('wgPageName');
            const namespace = mw.config.get('wgNamespaceNumber');

            if (namespace === 2 || namespace === 3) {
                const parts = pageName.split(':');
                if (parts.length > 1) {
                    let userPart = parts[1].split('/')[0];
                    if (userPart) return userPart;
                }
            }

            if (pageName.startsWith('Speciale:Contributi/') || pageName.startsWith('Special:Contributions/')) {
                const parts = pageName.split('/');
                if (parts.length > 1 && parts[1]) {
                    return parts[1];
                }
            }

            const targetParam = mw.util.getParamValue('target');
            if (targetParam) return targetParam;

            return null;
        },

        showReportModal(username) {
            return new Promise((resolve) => {
                $('#custom-report-modal').remove();

                let optionsHtml = '';
                WikiTools.Config.segnalazioni.forEach((seg, idx) => {
                    optionsHtml += `<label style="display: block; margin-bottom: 6px; cursor: pointer; font-size: 13px;">
                        <input type="radio" name="report-type" value="${idx}" ${idx === 0 ? 'checked' : ''} style="margin-right: 8px;"> ${seg.label}
                    </label>`;
                });

                const $modal = $(`
                    <div id="custom-report-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; align-items: center; justify-content: center;">
                        <div style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); width: 420px; font-family: sans-serif;">
                            <h3 style="margin-top: 0; font-size: 15px; color: #333; border-bottom: 1px solid #eaecf0; padding-bottom: 8px;">Segnala utente: <b>${username}</b></h3>
                            <div style="margin: 12px 0;">
                                <label style="display: block; font-size: 13px; font-weight: bold; margin-bottom: 5px;">Motivo della segnalazione:</label>
                                <div style="max-height: 150px; overflow-y: auto; border: 1px solid #eaecf0; padding: 5px; margin-bottom: 10px;">${optionsHtml}</div>
                                <label style="display: block; font-size: 13px; font-weight: bold; margin-bottom: 5px;">Dettagli / Motivazione aggiuntiva:</label>
                                <textarea id="report-motivo-text" placeholder="Descrivi brevemente il motivo..." style="width: 100%; height: 60px; padding: 6px; font-size: 13px; border: 1px solid #ccc; border-radius: 3px; box-sizing: border-box;"></textarea>
                            </div>
                            <div style="text-align: right; margin-top: 15px; border-top: 1px solid #eaecf0; padding-top: 10px;">
                                <button id="rep-cancel" style="margin-right: 10px; padding: 6px 12px; cursor: pointer; background: #eaecf0; border: none; border-radius: 4px;">Annulla</button>
                                <button id="rep-confirm" style="padding: 6px 14px; background: #d33; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Invia Segnalazione</button>
                            </div>
                        </div>
                    </div>
                `);

                $('body').append($modal);

                $('#rep-cancel').on('click', () => {
                    $modal.remove();
                    resolve(null);
                });

                $('#rep-confirm').on('click', () => {
                    const selectedIdx = $('input[name="report-type"]:checked').val();
                    const motivazione = $('#report-motivo-text').val().trim();
                    const configSeg = WikiTools.Config.segnalazioni[selectedIdx];

                    if (!motivazione) {
                        alert("Inserisci una motivazione per la segnalazione!");
                        return;
                    }

                    $modal.remove();
                    resolve({
                        target: configSeg.target,
                        template: configSeg.value,
                        motivo: motivazione
                    });
                });
            });
        },

        async submitReport(username, data) {
            const api = new mw.Api();
            let textFormatted = data.template
                .replace(/\$utente\$/g, username)
                .replace(/\$motivo\$/g, data.motivo);

            try {
                await api.postWithEditToken({
                    action: 'edit',
                    title: data.target,
                    appendtext: "\n" + textFormatted,
                    summary: `Segnalazione utente [[Special:Contributions/${username}|${username}]]`
                });

                alert("Segnalazione inviata con successo!");
            } catch (err) {
                alert("Errore durante l'invio della segnalazione: " + (err.error ? err.error.info : JSON.stringify(err)));
            }
        }
    };

    async function checkPageIntegrityBeforeEdit(api, pageName) {
        const initialRevId = mw.config.get('wgCurRevisionId');

        const queryData = await api.get({
            action: 'query',
            prop: 'revisions',
            titles: pageName,
            rvlimit: 1,
            rvprop: 'ids'
        });

        const pages = queryData.query.pages;
        const pageId = Object.keys(pages)[0];

        if (pageId === "-1" || !pages[pageId].revisions) {
            return confirm("Attenzione: la pagina risulta eliminata nel frattempo!\n\nVuoi procedere ugualmente (creandola di nuovo)?");
        }

        const currentRevId = pages[pageId].revisions[0].revid;

        if (initialRevId && currentRevId > initialRevId) {
            return confirm(
                `Attenzione!\nLa pagina ha subito modifiche successive da quando l'hai aperta (revisione attuale: ${currentRevId}, revisione iniziale: ${initialRevId}).\n\nVuoi procedere comunque con la modifica?`
            );
        }

        return true;
    }

    WikiTools.Templates = {
        showMacroOptionsModal(macroObj) {
            return new Promise((resolve) => {
                $('#custom-macro-modal').remove();

                let optionsHtml = '';
                macroObj.options.forEach((opt, idx) => {
                    optionsHtml += `<label style="display: block; margin-bottom: 6px; cursor: pointer; font-size: 13px;">
                        <input type="radio" name="macro-option" value="${idx}" ${idx === 0 ? 'checked' : ''} style="margin-right: 8px;"> ${opt.name}
                    </label>`;
                });

                const $modal = $(`
                    <div id="custom-macro-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; align-items: center; justify-content: center;">
                        <div style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); width: 450px; max-height: 90vh; display: flex; flex-direction: column; font-family: sans-serif;">
                            <h3 style="margin-top: 0; font-size: 15px; color: #333; border-bottom: 1px solid #eaecf0; padding-bottom: 8px;">Seleziona avviso (${macroObj.name}):</h3>
                            <div style="margin: 10px 0; overflow-y: auto; max-height: 350px; flex-grow: 1; padding-right: 5px;">${optionsHtml}</div>
                            <div style="text-align: right; margin-top: 15px; border-top: 1px solid #eaecf0; padding-top: 10px;">
                                <button id="macro-cancel" style="margin-right: 10px; padding: 6px 12px; cursor: pointer; background: #eaecf0; border: none; border-radius: 4px;">Annulla</button>
                                <button id="macro-confirm" style="padding: 6px 14px; background: #0645ad; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Conferma</button>
                            </div>
                        </div>
                    </div>
                `);

                $('body').append($modal);

                $('#macro-cancel').on('click', () => {
                    $modal.remove();
                    resolve(null);
                });

                $('#macro-confirm').on('click', () => {
                    const selectedIdx = $('input[name="macro-option"]:checked').val();
                    const chosenOption = macroObj.options[selectedIdx];
                    $modal.remove();
                    resolve(chosenOption);
                });
            });
        },

        async process(data, isDiscussion = false) {
            let finalParameters = {};

            if (data.fields && data.fields.length > 0) {
                for (let field of data.fields) {
                    if (field.type === 1) {
                        let userInput = prompt(`Inserisci il valore per "${field.name}" (${field.description}):`);
                        if (userInput === null) return;
                        if (field.required && !userInput.trim()) {
                            alert("Il campo è obbligatorio!");
                            return;
                        }
                        finalParameters[field.name] = userInput.trim();

                    } else if ((field.type === 2 || field.type === 3) && field.options) {
                        let selectedVal = await this.showOptionsModal(field);
                        if (selectedVal === null) return;
                        finalParameters[field.name] = selectedVal;
                    }
                }
            }

            let processedText = data.text;
            let processedSubject = data.subject;
            let processedTitle = data.title || data.subject;

            for (let key in finalParameters) {
                const regex = new RegExp(`\\$${key}\\$`, 'g');
                processedText = processedText.replace(regex, finalParameters[key]);
                processedSubject = processedSubject.replace(regex, finalParameters[key]);
                processedTitle = processedTitle.replace(regex, finalParameters[key]);
            }

            const actionDesc = isDiscussion ? `Aggiungere un nuovo argomento "${processedTitle}" in fondo alla discussione?` : `Inserire il contenuto di "${data.name}" in cima alla pagina?`;
            if (!confirm(actionDesc)) return;

            this.apply({
                name: data.name,
                text: processedText,
                subject: processedSubject,
                title: processedTitle,
                isDiscussion: isDiscussion
            });
        },

        showOptionsModal(field) {
            return new Promise((resolve) => {
                $('#custom-options-modal').remove();

                let optionsHtml = '';
                field.options.forEach((opt, idx) => {
                    optionsHtml += `<label style="display: block; margin-bottom: 6px; cursor: pointer; font-size: 13px;">
                        <input type="radio" name="template-option" value="${opt.value}" ${idx === 0 ? 'checked' : ''} style="margin-right: 8px;"> ${opt.name}
                    </label>`;
                });

                if (field.type === 3) {
                    optionsHtml += `<label style="display: block; margin-top: 10px; margin-bottom: 6px; cursor: pointer; font-size: 13px; border-top: 1px solid #eaecf0; padding-top: 8px;">
                        <input type="radio" name="template-option" value="__altro__" style="margin-right: 8px;"> <strong>Altro (specifica)</strong>
                    </label>
                    <div id="altro-input-container" style="display: none; margin-top: 5px; margin-left: 20px;">
                        <input type="text" id="altro-text-val" placeholder="Inserisci il valore..." style="width: 90%; padding: 4px; font-size: 13px; border: 1px solid #ccc; border-radius: 3px;">
                    </div>`;
                }

                const maxHeight = field.type === 3 ? '450px' : '350px';

                const $modal = $(`
                    <div id="custom-options-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; align-items: center; justify-content: center;">
                        <div style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); width: 450px; max-height: 90vh; display: flex; flex-direction: column; font-family: sans-serif;">
                            <h3 style="margin-top: 0; font-size: 15px; color: #333; border-bottom: 1px solid #eaecf0; padding-bottom: 8px;">Seleziona: ${field.description}</h3>
                            <div style="margin: 10px 0; overflow-y: auto; max-height: ${maxHeight}; flex-grow: 1; padding-right: 5px;">${optionsHtml}</div>
                            <div style="text-align: right; margin-top: 15px; border-top: 1px solid #eaecf0; padding-top: 10px;">
                                <button id="opt-cancel" style="margin-right: 10px; padding: 6px 12px; cursor: pointer; background: #eaecf0; border: none; border-radius: 4px;">Annulla</button>
                                <button id="opt-confirm" style="padding: 6px 14px; background: #0645ad; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Conferma</button>
                            </div>
                        </div>
                    </div>
                `);

                $('body').append($modal);

                if (field.type === 3) {
                    $('input[name="template-option"]').on('change', function() {
                        if ($(this).val() === '__altro__') {
                            $('#altro-input-container').show();
                            $('#altro-text-val').focus();
                        } else {
                            $('#altro-input-container').hide();
                        }
                    });
                }

                $('#opt-cancel').on('click', () => {
                    $modal.remove();
                    resolve(null);
                });

                $('#opt-confirm').on('click', () => {
                    const selected = $('input[name="template-option"]:checked').val();

                    if (selected === '__altro__') {
                        const customVal = $('#altro-text-val').val().trim();
                        if (!customVal) {
                            alert("Inserisci un valore per il campo 'Altro'!");
                            return;
                        }
                        $modal.remove();
                        resolve(customVal);
                    } else {
                        $modal.remove();
                        resolve(selected);
                    }
                });
            });
        },

        async apply(data) {
            const api = new mw.Api();
            const pageName = mw.config.get('wgPageName');

            try {
                const canProceed = await checkPageIntegrityBeforeEdit(api, pageName);
                if (!canProceed) return;

                if (data.isDiscussion) {
                    await api.postWithEditToken({
                        action: 'edit',
                        title: pageName,
                        section: 'new',
                        sectiontitle: data.title,
                        text: data.text
                    });
                } else {
                    await api.postWithEditToken({
                        action: 'edit',
                        title: pageName,
                        prependtext: data.text + "\n",
                        summary: data.subject
                    });
                }

                location.reload();
            } catch (err) {
                alert('Errore API: ' + (err.error ? err.error.info : JSON.stringify(err)));
            }
        }
    };

    WikiTools.Undo = {
        showModal() {
            $('#custom-undo-modal').remove();

            let optionsHtml = '';
            WikiTools.Config.motiviUndo.forEach((m, idx) => {
                optionsHtml += `<label style="display: block; margin-bottom: 8px; cursor: pointer; font-size: 14px;">
                    <input type="radio" name="undo-motivo" value="${idx}" ${idx === 0 ? 'checked' : ''} style="margin-right: 8px;"> ${m.label}
                </label>`;
            });

            const $modal = $(`
                <div id="custom-undo-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; align-items: center; justify-content: center;">
                    <div style="background: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); width: 350px; font-family: sans-serif;">
                        <h3 style="margin-top: 0; font-size: 16px; color: #333; border-bottom: 1px solid #eaecf0; padding-bottom: 8px;">Seleziona il motivo dell'annullamento</h3>
                        <div style="margin: 15px 0;">${optionsHtml}</div>
                        <div style="text-align: right; margin-top: 20px;">
                            <button id="modal-cancel" style="margin-right: 10px; padding: 6px 14px; cursor: pointer; background: #eaecf0; border: none; border-radius: 4px;">Annulla</button>
                            <button id="modal-confirm" style="padding: 6px 14px; background: #d33; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Conferma</button>
                        </div>
                    </div>
                </div>
            `);

            $('body').append($modal);

            $('#modal-cancel').on('click', () => $modal.remove());
            $('#modal-confirm').on('click', () => {
                const selectedIdx = $('input[name="undo-motivo"]:checked').val();
                const motivoScelto = WikiTools.Config.motiviUndo[selectedIdx];
                $modal.remove();
                this.execute(motivoScelto);
            });
        },

        async execute(motivo) {
            let diffId = mw.config.get('wgDiffNewId');
            if (!diffId) {
                const paramDiff = mw.util.getParamValue('diff');
                if (paramDiff && !isNaN(paramDiff)) {
                    diffId = parseInt(paramDiff, 10);
                }
            }

            if (!diffId) {
                alert("Errore: impossibile determinare l'ID numerico della revisione.");
                return;
            }

            const pageName = mw.config.get('wgPageName');
            const api = new mw.Api();

            try {
                const canProceed = await checkPageIntegrityBeforeEdit(api, pageName);
                if (!canProceed) return;

                const revData = await api.get({
                    action: 'query',
                    prop: 'revisions',
                    revids: diffId,
                    rvprop: 'user|ids'
                });

                const pages = revData.query.pages;
                const pageId = Object.keys(pages)[0];
                const autore = pages[pageId].revisions[0].user;
                const parentId = pages[pageId].revisions[0].parentid;

                if (!parentId) {
                    alert("Impossibile trovare la versione precedente a cui tornare.");
                    return;
                }

                const parentData = await api.get({
                    action: 'query',
                    prop: 'revisions',
                    revids: parentId,
                    rvprop: 'content',
                    rvslots: 'main'
                });

                const revObj = parentData.query.pages[pageId].revisions[0];
                let parentText = undefined;
                if (revObj.slots && revObj.slots.main) {
                    parentText = revObj.slots.main['*'];
                } else if (revObj['*']) {
                    parentText = revObj['*'];
                }

                if (parentText === undefined) {
                    alert("Errore: impossibile leggere il testo della revisione precedente.");
                    return;
                }

                const summary = `Annullata la modifica [[Special:Diff/${diffId}|${diffId}]] di [[Special:Contributions/${autore}|${autore}]] ([[User talk:${autore}|discussione]]) - Modifica effettuata con un tool semiautomatico, in caso di errore [[User talk:SparaPanini|contattami]]`;

                await api.postWithEditToken({
                    action: 'edit',
                    title: pageName,
                    text: parentText,
                    summary: summary
                });

                if (motivo.text) {
                    const talkTitle = `User talk:${autore}`;
                    const messaggio = motivo.text + " --~~~~";

                    const cleanPageTitle = mw.config.get('wgPageName').replace(/_/g, ' ');
                    const sectionTitle = `Modifiche su [[${cleanPageTitle}]] annullate`;

                    await api.postWithEditToken({
                        action: 'edit',
                        title: talkTitle,
                        section: 'new',
                        sectiontitle: sectionTitle,
                        text: messaggio
                    });
                }

                location.reload();

            } catch (err) {
                alert('Errore durante l\'operazione di undo: ' + (err.error ? err.error.info : JSON.stringify(err)));
            }
        }
    };

    WikiTools.UI.initViewMode();
    WikiTools.UI.initDiffMode();

    console.log('[WikiTools] Configurazione caricata e moduli inizializzati correttamente.');
})();