(async function() {
    'use strict';

    if (typeof mw === 'undefined') return;

    window.WikiTools = window.WikiTools || {};

    WikiTools.Config = {
        avvisiVoci: [
            {
                name: "cancella",
                type: 1,
                input: [
                    {
                        name: "criterio",
                        description: "criterio di rimozione",
                        type: "string",
                        required: true
                    }
                ],
                subject: "+cancella subito",
                text: "{{cancella subito|$criterio$}}"
            },
            {
                name: "bozza",
                type: 1,
                input: [
                    {
                        name: "criterio",
                        description: "criterio di rimozione",
                        type: "string",
                        required: true
                    }
                ],
                subject: "+sposta in bozza",
                text: "{{Sposta in Bozza|$criterio$}}"
            },
            {
                name: "fonti",
                type: 1,
                input: [
                    {
                        name: "argomento",
                        description: "argomento della pagina",
                        type: "string",
                        required: true
                    }
                ],
                subject: "+F",
                text: "{{F|$argomento$|{{subst:#timel:F Y}}}}"
            },
            {
                name: "wikificare",
                type: 1,
                input: [
                    {
                        name: "argomento",
                        description: "argomento della pagina",
                        type: "string",
                        required: true
                    }
                ],
                subject: "+F",
                text: "{{W|$argomento$|{{subst:#timel:F Y}}}}"
            }
        ],
        motiviUndo: [
            { id: "vandalismo", label: "Vandalismo", text: "{{Vandalismo}}" },
            { id: "cartellino", label: "Cartellino giallo", text: "{{Yc}}" },
            { id: "test", label: "Test / Prova", text: "{{Test}}" },
            { id: "rimozione contenuti", label: "Rimozione contenuti", text: "{{RimozioneContenuti}}" },
            { id: "rimozione avvisi", label: "Rimozione avvisi", text: "{{Avvisoavvisi}}" },

            { id: "debug", label: "Debug", text: "Test" },
            { id: "altro", label: "Altro (solo annullamento)", text: null },
            ]
    };

    WikiTools.UI = {
        initViewMode() {
            if (mw.config.get('wgAction') !== 'view') return;

            $(document).ready(() => {
                const $editTab = $('#ca-edit, #ca-ve-edit, .vector-tab-empty');
                if (!$editTab.length && !$('#ca-viewsource').length) return;

                let menuItemsHtml = '';
                WikiTools.Config.avvisiVoci.forEach((item, index) => {
                    menuItemsHtml += `<a href="#" class="speedy-item" data-index="${index}" style="display: block; padding: 6px 10px; color: #0645ad; text-decoration: none; border-bottom: 1px solid #eaecf0;">${item.name}</a>`;
                });

                const $menuContainer = $(
                    `<li id="ca-speedy-delete" class="mw-list-item" style="position: relative; display: inline-block; vertical-align: middle;">
                        <a href="#" id="speedy-toggle">
                            <span>Quick add</span>
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

                $('#speedy-toggle').on('click', function(e) {
                    e.preventDefault();
                    $('#speedy-dropdown').toggle();
                });

                $(document).on('click', function(e) {
                    if (!$(e.target).closest('#ca-speedy-delete').length) {
                        $('#speedy-dropdown').hide();
                    }
                });

                $('.speedy-item').on('click', function(e) {
                    e.preventDefault();
                    $('#speedy-dropdown').hide();
                    const index = $(this).attr('data-index');
                    WikiTools.Templates.process(WikiTools.Config.avvisiVoci[index]);
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

    WikiTools.Templates = {
        process(data) {
            let finalParameters = {};

            if (data.type === 1 && data.input && data.input.length > 0) {
                for (let field of data.input) {
                    let userInput = prompt(`Inserisci il valore per "${field.name}" (${field.description}):`);
                    if (userInput === null) return;
                    if (field.required && !userInput.trim()) {
                        alert("Il campo è obbligatorio!");
                        return;
                    }
                    finalParameters[field.name] = userInput.trim();
                }
            }

            let processedText = data.text;
            let processedSubject = data.subject;

            for (let key in finalParameters) {
                const regex = new RegExp(`\\$${key}\\$`, 'g');
                processedText = processedText.replace(regex, finalParameters[key]);
                processedSubject = processedSubject.replace(regex, finalParameters[key]);
            }

            if (!confirm(`Inserire il contenuto di "${data.name}" in cima alla pagina?`)) return;

            this.apply({
                name: data.name,
                text: processedText,
                subject: processedSubject
            });
        },

        apply(data) {
            const api = new mw.Api();
            api.postWithEditToken({
                action: 'edit',
                title: mw.config.get('wgPageName'),
                prependtext: data.text + "\n",
                summary: data.subject
            }).done(res => {
                if (res && res.edit && res.edit.result === 'Success') {
                    location.reload();
                } else {
                    alert('Errore durante la modifica.');
                }
            }).fail(err => {
                alert('Errore API: ' + (err.error ? err.error.info : JSON.stringify(err)));
            });
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
                    rvslots: '*'
                });

                const revObj = parentData.query.pages[pageId].revisions[0];
                const parentText = revObj.slots ? revObj.slots.main['*'] : revObj['*'];

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
                    await api.postWithEditToken({
                        action: 'edit',
                        title: talkTitle,
                        section: 'new',
                        sectiontitle: 'Modifica annullata',
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

    console.log('[WikiTools] Moduli caricati e inizializzati correttamente.');
})();